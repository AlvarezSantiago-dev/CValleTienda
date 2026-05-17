'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateEAN13 } from '@/lib/barcode'
import { getContextoTienda } from '@/lib/supabase/context'
import { LIMITES_BASICO } from '@/lib/planes/config'

// =============================================================
// TIPOS DE INPUT
// =============================================================

export interface VarianteInput {
  /** id si es variante existente; undefined si es nueva */
  id?: string
  talla_id: string | null
  color_id: string | null
  codigo_barras: string | null
  precio_venta: number | null
  stock_inicial: number
  stock_minimo: number
  /** marcar como eliminada (soft delete) */
  eliminar?: boolean
}

export interface ProductoInput {
  nombre: string
  descripcion: string | null
  codigo_base: string | null
  categoria_id: string | null
  precio_compra: number
  precio_venta: number
  unidad_de_medida: string
  imagen_url: string | null
  variantes: VarianteInput[]
}

export interface ActionResult<T = unknown> {
  ok: boolean
  error?: string
  data?: T
}

// =============================================================
// HELPERS DE AUTH
// =============================================================

async function requireTiendaId() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('No autenticado')
  const { data: perfil, error } = await supabase
    .from('perfiles')
    .select('tienda_id, rol')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (error) throw error
  if (!perfil) throw new Error('Perfil no encontrado')
  return { supabase, tiendaId: perfil.tienda_id, rol: perfil.rol, userId: auth.user.id }
}

// =============================================================
// VALIDACIONES
// =============================================================

function validarProducto(input: ProductoInput): string | null {
  if (!input.nombre?.trim()) return 'El nombre es obligatorio'
  if (input.nombre.length > 200) return 'El nombre es demasiado largo'
  if (input.precio_venta < 0) return 'Precio de venta inválido'
  if (input.precio_compra < 0) return 'Precio de compra inválido'
  if (!input.variantes || input.variantes.length === 0)
    return 'Debe tener al menos una variante'

  const activas = input.variantes.filter((v) => !v.eliminar)
  if (activas.length === 0) return 'Debe tener al menos una variante activa'

  const seen = new Set<string>()
  for (const v of activas) {
    const key = `${v.talla_id ?? ''}_${v.color_id ?? ''}`
    if (seen.has(key))
      return 'No puede haber dos variantes con la misma combinación talla/color'
    seen.add(key)
    if (v.stock_inicial < 0) return 'Stock inicial no puede ser negativo'
    if (v.stock_minimo < 0) return 'Stock mínimo no puede ser negativo'
    if (v.precio_venta != null && v.precio_venta < 0) return 'Precio de variante inválido'
    if (v.codigo_barras && !/^[0-9A-Za-z\-]{4,32}$/.test(v.codigo_barras))
      return `Código de barras inválido: ${v.codigo_barras}`
  }
  return null
}

// =============================================================
// CREAR PRODUCTO
// =============================================================

export async function crearProducto(input: ProductoInput): Promise<ActionResult<{ id: string }>> {
  try {
    const err = validarProducto(input)
    if (err) return { ok: false, error: err }

    const { supabase, tiendaId, userId } = await requireTiendaId()

    // Guard: límite de productos en plan Básico
    const ctx = await getContextoTienda()
    if (ctx && ctx.planEfectivo === 'basico') {
      const { count } = await supabase
        .from('productos')
        .select('id', { count: 'exact', head: true })
        .eq('tienda_id', tiendaId)
        .eq('activo', true)
      if ((count ?? 0) >= LIMITES_BASICO.max_productos) {
        return {
          ok: false,
          error: `Alcanzaste el límite de ${LIMITES_BASICO.max_productos} productos del plan Básico. Upgrade a Pro para productos ilimitados.`,
        }
      }
    }

    const { data: producto, error: prodErr } = await supabase
      .from('productos')
      .insert({
        tienda_id: tiendaId,
        nombre: input.nombre.trim(),
        descripcion: input.descripcion?.trim() || null,
        codigo_base: input.codigo_base?.trim() || null,
        categoria_id: input.categoria_id || null,
        precio_compra: input.precio_compra,
        precio_venta: input.precio_venta,
        unidad_de_medida: input.unidad_de_medida || 'unidad',
        imagen_url: input.imagen_url?.trim() || null,
        activo: true,
      })
      .select('id')
      .single()

    if (prodErr || !producto) {
      return { ok: false, error: prodErr?.message ?? 'Error al crear producto' }
    }

    const productoId = producto.id

    // Insertar variantes (solo no eliminadas)
    const variantesActivas = input.variantes.filter((v) => !v.eliminar)
    const variantesPayload = variantesActivas.map((v) => ({
      tienda_id: tiendaId,
      producto_id: productoId,
      talla_id: v.talla_id || null,
      color_id: v.color_id || null,
      codigo_barras: v.codigo_barras?.trim() || null,
      precio_venta: v.precio_venta,
      stock_actual: v.stock_inicial,
      stock_minimo: v.stock_minimo,
      activo: true,
    }))

    const { data: variantesInsertadas, error: varErr } = await supabase
      .from('variantes_producto')
      .insert(variantesPayload)
      .select('id, stock_actual')

    if (varErr) {
      // Rollback manual: eliminar el producto recién creado
      await supabase.from('productos').delete().eq('id', productoId)
      return { ok: false, error: traducirError(varErr.message) }
    }

    // Insertar movimientos de stock inicial para variantes con stock > 0
    const movimientos = (variantesInsertadas ?? [])
      .filter((v) => v.stock_actual > 0)
      .map((v) => ({
        tienda_id: tiendaId,
        variante_id: v.id,
        tipo: 'inicial' as const,
        cantidad: v.stock_actual,
        stock_anterior: 0,
        stock_posterior: v.stock_actual,
        motivo: 'Stock inicial al crear producto',
        venta_id: null,
        usuario_id: userId,
      }))

    if (movimientos.length > 0) {
      const { error: movErr } = await supabase.from('movimientos_stock').insert(movimientos)
      if (movErr) {
        // No bloqueamos creación por fallar el log de movimientos
        console.error('Error al insertar movimientos de stock:', movErr)
      }
    }

    revalidatePath('/productos')
    return { ok: true, data: { id: productoId } }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// =============================================================
// ACTUALIZAR PRODUCTO
// =============================================================

export async function actualizarProducto(
  id: string,
  input: ProductoInput
): Promise<ActionResult> {
  try {
    const err = validarProducto(input)
    if (err) return { ok: false, error: err }

    const { supabase, tiendaId, userId } = await requireTiendaId()

    const { error: prodErr } = await supabase
      .from('productos')
      .update({
        nombre: input.nombre.trim(),
        descripcion: input.descripcion?.trim() || null,
        codigo_base: input.codigo_base?.trim() || null,
        categoria_id: input.categoria_id || null,
        precio_compra: input.precio_compra,
        precio_venta: input.precio_venta,
        unidad_de_medida: input.unidad_de_medida || 'unidad',
        imagen_url: input.imagen_url?.trim() || null,
      })
      .eq('id', id)
      .eq('tienda_id', tiendaId)

    if (prodErr) return { ok: false, error: prodErr.message }

    // Procesar variantes: existentes (con id) → update, nuevas → insert,
    // eliminar=true → soft delete (activo=false)
    for (const v of input.variantes) {
      if (v.id && v.eliminar) {
        await supabase
          .from('variantes_producto')
          .update({ activo: false })
          .eq('id', v.id)
          .eq('tienda_id', tiendaId)
        continue
      }
      if (v.id) {
        // Update sin tocar stock_actual (eso se maneja por movimientos)
        const { error: uErr } = await supabase
          .from('variantes_producto')
          .update({
            talla_id: v.talla_id || null,
            color_id: v.color_id || null,
            codigo_barras: v.codigo_barras?.trim() || null,
            precio_venta: v.precio_venta,
            stock_minimo: v.stock_minimo,
            activo: true,
          })
          .eq('id', v.id)
          .eq('tienda_id', tiendaId)
        if (uErr) return { ok: false, error: traducirError(uErr.message) }
      } else {
        // Variante nueva
        const { data: nueva, error: iErr } = await supabase
          .from('variantes_producto')
          .insert({
            tienda_id: tiendaId,
            producto_id: id,
            talla_id: v.talla_id || null,
            color_id: v.color_id || null,
            codigo_barras: v.codigo_barras?.trim() || null,
            precio_venta: v.precio_venta,
            stock_actual: v.stock_inicial,
            stock_minimo: v.stock_minimo,
            activo: true,
          })
          .select('id')
          .single()

        if (iErr) return { ok: false, error: traducirError(iErr.message) }

        if (nueva && v.stock_inicial > 0) {
          await supabase.from('movimientos_stock').insert({
            tienda_id: tiendaId,
            variante_id: nueva.id,
            tipo: 'inicial',
            cantidad: v.stock_inicial,
            stock_anterior: 0,
            stock_posterior: v.stock_inicial,
            motivo: 'Stock inicial — nueva variante',
            venta_id: null,
            usuario_id: userId,
          })
        }
      }
    }

    revalidatePath('/productos')
    revalidatePath(`/productos/${id}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// =============================================================
// ELIMINAR (soft delete)
// =============================================================

export async function eliminarProducto(id: string): Promise<ActionResult> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase
      .from('productos')
      .update({ activo: false })
      .eq('id', id)
      .eq('tienda_id', tiendaId)
    if (error) return { ok: false, error: error.message }
    // También desactivar variantes
    await supabase
      .from('variantes_producto')
      .update({ activo: false })
      .eq('producto_id', id)
      .eq('tienda_id', tiendaId)

    revalidatePath('/productos')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// =============================================================
// DUPLICAR
// =============================================================

export async function duplicarProducto(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    const { supabase, tiendaId, userId } = await requireTiendaId()

    const { data: orig, error: oErr } = await supabase
      .from('productos')
      .select('*, variantes:variantes_producto(*)')
      .eq('id', id)
      .eq('tienda_id', tiendaId)
      .maybeSingle()
    if (oErr) return { ok: false, error: oErr.message }
    if (!orig) return { ok: false, error: 'Producto no encontrado' }

    const { data: nuevo, error: nErr } = await supabase
      .from('productos')
      .insert({
        tienda_id: tiendaId,
        nombre: `${orig.nombre} (copia)`,
        descripcion: orig.descripcion,
        codigo_base: null,
        categoria_id: orig.categoria_id,
        precio_compra: orig.precio_compra,
        precio_venta: orig.precio_venta,
        imagen_url: orig.imagen_url,
        activo: true,
      })
      .select('id')
      .single()

    if (nErr || !nuevo) return { ok: false, error: nErr?.message ?? 'Error al duplicar' }

    const variantesOrig = (orig.variantes ?? []) as Array<{
      talla_id: string | null
      color_id: string | null
      precio_venta: number | null
      stock_minimo: number
      activo: boolean
    }>

    if (variantesOrig.length > 0) {
      const payload = variantesOrig
        .filter((v) => v.activo)
        .map((v) => ({
          tienda_id: tiendaId,
          producto_id: nuevo.id,
          talla_id: v.talla_id,
          color_id: v.color_id,
          codigo_barras: null, // No duplicamos código (debe ser único)
          precio_venta: v.precio_venta,
          stock_actual: 0,
          stock_minimo: v.stock_minimo,
          activo: true,
        }))
      if (payload.length > 0) {
        await supabase.from('variantes_producto').insert(payload)
      }
    }

    void userId
    revalidatePath('/productos')
    return { ok: true, data: { id: nuevo.id } }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// =============================================================
// CÓDIGO DE BARRAS — generar único
// =============================================================

/**
 * Genera un EAN-13 que aún no exista en la tienda. Se usa desde
 * el form de edición vía Server Action invocada con form action.
 */
export async function generarCodigoBarrasUnico(): Promise<ActionResult<{ codigo: string }>> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()
    for (let intento = 0; intento < 8; intento++) {
      const codigo = generateEAN13('200')
      const { data, error } = await supabase
        .from('variantes_producto')
        .select('id')
        .eq('tienda_id', tiendaId)
        .eq('codigo_barras', codigo)
        .maybeSingle()
      if (error) return { ok: false, error: error.message }
      if (!data) return { ok: true, data: { codigo } }
    }
    return { ok: false, error: 'No se pudo generar un código único, reintentá' }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/**
 * Busca una variante por código de barras exacto y devuelve el producto
 * al que pertenece. Usado para "escanear → ir al detalle del producto".
 */
export async function buscarProductoPorCodigoBarras(
  codigo: string
): Promise<ActionResult<{ producto_id: string } | null>> {
  try {
    const c = codigo.trim()
    if (!c) return { ok: true, data: null }
    const { supabase, tiendaId } = await requireTiendaId()
    const { data, error } = await supabase
      .from('variantes_producto')
      .select('producto_id')
      .eq('tienda_id', tiendaId)
      .eq('codigo_barras', c)
      .maybeSingle()
    if (error) return { ok: false, error: error.message }
    if (!data) return { ok: true, data: null }
    return { ok: true, data: { producto_id: data.producto_id as string } }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// =============================================================
// HELPERS PRIVADOS — RESOLUCIÓN DE TAXONOMÍA PARA IMPORTACIÓN
// Reciben el cliente supabase ya autenticado; buscan por nombre
// (case-insensitive) y crean el registro si no existe.
// =============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function _resolverOCrearCategoria(supabase: any, tiendaId: string, nombre: string): Promise<string> {
  const n = nombre.trim()
  const { data: ex } = await supabase.from('categorias').select('id').eq('tienda_id', tiendaId).ilike('nombre', n).maybeSingle()
  if (ex) return ex.id
  const { data: cr, error } = await supabase.from('categorias').insert({ tienda_id: tiendaId, nombre: n, activo: true }).select('id').single()
  if (error) throw error
  return cr.id
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function _resolverOCrearTalla(supabase: any, tiendaId: string, nombre: string): Promise<string> {
  const n = nombre.trim()
  const { data: ex } = await supabase.from('tallas').select('id').eq('tienda_id', tiendaId).ilike('nombre', n).maybeSingle()
  if (ex) return ex.id
  const { data: cr, error } = await supabase.from('tallas').insert({ tienda_id: tiendaId, nombre: n, activo: true }).select('id').single()
  if (error) throw error
  return cr.id
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function _resolverOCrearColor(supabase: any, tiendaId: string, nombre: string): Promise<string> {
  const n = nombre.trim()
  const { data: ex } = await supabase.from('colores').select('id').eq('tienda_id', tiendaId).ilike('nombre', n).maybeSingle()
  if (ex) return ex.id
  const { data: cr, error } = await supabase.from('colores').insert({ tienda_id: tiendaId, nombre: n, activo: true }).select('id').single()
  if (error) throw error
  return cr.id
}

// =============================================================
// IMPORTACIÓN MASIVA CSV
// =============================================================

export interface FilaCSVImport {
  nombre: string
  descripcion?: string
  categoria?: string
  codigo_base?: string
  precio_compra: number
  precio_venta: number
  unidad?: string
  talla?: string
  color?: string
  codigo_barras?: string
  stock_actual: number
  stock_minimo: number
}

export interface ResultadoFilaImport {
  fila: number
  nombre: string
  ok: boolean
  error?: string
  productoId?: string
}

export interface ResultadoImportacion {
  ok: boolean
  total: number
  exitosos: number
  errores: ResultadoFilaImport[]
}

/**
 * Importa productos masivamente desde filas parseadas de un CSV.
 * Agrupa filas por codigo_base (o nombre si no hay) para construir
 * un producto con múltiples variantes. Resuelve/crea categorías,
 * tallas y colores automáticamente por nombre.
 */
export async function importarProductosCSV(
  filas: FilaCSVImport[]
): Promise<ResultadoImportacion> {
  const { supabase, tiendaId, userId } = await requireTiendaId()

  const MAX_FILAS = 500
  if (filas.length > MAX_FILAS) {
    return {
      ok: false,
      total: filas.length,
      exitosos: 0,
      errores: [{ fila: 0, nombre: '', ok: false, error: `Máximo ${MAX_FILAS} filas por importación` }],
    }
  }

  // Agrupar filas por clave de producto (codigo_base ?? nombre)
  const grupos = new Map<string, { filas: FilaCSVImport[]; indices: number[] }>()
  filas.forEach((fila, idx) => {
    const clave = (fila.codigo_base?.trim() || fila.nombre.trim()).toLowerCase()
    if (!grupos.has(clave)) grupos.set(clave, { filas: [], indices: [] })
    grupos.get(clave)!.filas.push(fila)
    grupos.get(clave)!.indices.push(idx + 2) // +2 porque fila 1 = encabezado
  })

  const errores: ResultadoFilaImport[] = []
  let exitosos = 0

  for (const [, grupo] of grupos) {
    const primera = grupo.filas[0]
    const indiceRef = grupo.indices[0]

    try {
      // Resolver categoría
      let categoriaId: string | null = null
      if (primera.categoria?.trim()) {
        categoriaId = await _resolverOCrearCategoria(supabase, tiendaId, primera.categoria.trim())
      }

      // Construir variantes
      const variantes: VarianteInput[] = []
      for (let i = 0; i < grupo.filas.length; i++) {
        const f = grupo.filas[i]

        let tallaId: string | null = null
        if (f.talla?.trim()) {
          tallaId = await _resolverOCrearTalla(supabase, tiendaId, f.talla.trim())
        }

        let colorId: string | null = null
        if (f.color?.trim()) {
          colorId = await _resolverOCrearColor(supabase, tiendaId, f.color.trim())
        }

        // Generar código de barras si está vacío
        let codigoBarras = f.codigo_barras?.trim() || null
        if (!codigoBarras) {
          for (let intento = 0; intento < 8; intento++) {
            const candidato = generateEAN13('200')
            const { data: existe } = await supabase
              .from('variantes_producto')
              .select('id')
              .eq('tienda_id', tiendaId)
              .eq('codigo_barras', candidato)
              .maybeSingle()
            if (!existe) { codigoBarras = candidato; break }
          }
        }

        variantes.push({
          talla_id: tallaId,
          color_id: colorId,
          codigo_barras: codigoBarras,
          precio_venta: f.precio_venta,
          stock_inicial: f.stock_actual,
          stock_minimo: f.stock_minimo,
        })
      }

      const input: ProductoInput = {
        nombre: primera.nombre.trim(),
        descripcion: primera.descripcion?.trim() || null,
        codigo_base: primera.codigo_base?.trim() || null,
        categoria_id: categoriaId,
        precio_compra: primera.precio_compra,
        precio_venta: primera.precio_venta,
        unidad_de_medida: primera.unidad?.trim() || 'unidad',
        imagen_url: null,
        variantes,
      }

      // Insertar producto directamente (sin redirect)
      const { data: producto, error: prodErr } = await supabase
        .from('productos')
        .insert({
          tienda_id: tiendaId,
          nombre: input.nombre,
          descripcion: input.descripcion,
          codigo_base: input.codigo_base,
          categoria_id: input.categoria_id,
          precio_compra: input.precio_compra,
          precio_venta: input.precio_venta,
          unidad_de_medida: input.unidad_de_medida,
          imagen_url: null,
          activo: true,
        })
        .select('id')
        .single()

      if (prodErr || !producto) {
        errores.push({ fila: indiceRef, nombre: primera.nombre, ok: false, error: prodErr?.message ?? 'Error al crear producto' })
        continue
      }

      const variantesPayload = variantes.map((v) => ({
        tienda_id: tiendaId,
        producto_id: producto.id,
        talla_id: v.talla_id,
        color_id: v.color_id,
        codigo_barras: v.codigo_barras,
        precio_venta: v.precio_venta,
        stock_actual: v.stock_inicial,
        stock_minimo: v.stock_minimo,
        activo: true,
      }))

      const { data: variantesInsertadas, error: varErr } = await supabase
        .from('variantes_producto')
        .insert(variantesPayload)
        .select('id, stock_actual')

      if (varErr) {
        await supabase.from('productos').delete().eq('id', producto.id)
        errores.push({ fila: indiceRef, nombre: primera.nombre, ok: false, error: traducirError(varErr.message) })
        continue
      }

      // Movimientos de stock inicial
      const movimientos = (variantesInsertadas ?? [])
        .filter((v) => v.stock_actual > 0)
        .map((v) => ({
          tienda_id: tiendaId,
          variante_id: v.id,
          tipo: 'inicial' as const,
          cantidad: v.stock_actual,
          stock_anterior: 0,
          stock_posterior: v.stock_actual,
          motivo: 'Stock inicial — importación CSV',
          venta_id: null,
          usuario_id: userId,
        }))

      if (movimientos.length > 0) {
        await supabase.from('movimientos_stock').insert(movimientos)
      }

      exitosos++
    } catch (e) {
      errores.push({
        fila: indiceRef,
        nombre: primera.nombre,
        ok: false,
        error: (e as Error).message,
      })
    }
  }

  revalidatePath('/productos')
  return { ok: true, total: grupos.size, exitosos, errores }
}

// =============================================================
// TAXONOMÍAS — Categorías
// =============================================================

export async function crearCategoria(nombre: string, descripcion?: string): Promise<ActionResult> {
  try {
    if (!nombre?.trim()) return { ok: false, error: 'Nombre obligatorio' }
    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase.from('categorias').insert({
      tienda_id: tiendaId,
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
      activo: true,
    })
    if (error) return { ok: false, error: error.message }
    revalidatePath('/productos/categorias')
    revalidatePath('/productos')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function actualizarCategoria(
  id: string,
  nombre: string,
  descripcion?: string
): Promise<ActionResult> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase
      .from('categorias')
      .update({ nombre: nombre.trim(), descripcion: descripcion?.trim() || null })
      .eq('id', id)
      .eq('tienda_id', tiendaId)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/productos/categorias')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function eliminarCategoria(id: string): Promise<ActionResult> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase
      .from('categorias')
      .update({ activo: false })
      .eq('id', id)
      .eq('tienda_id', tiendaId)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/productos/categorias')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// =============================================================
// TAXONOMÍAS — Tallas
// =============================================================

export async function crearTalla(nombre: string, orden = 0): Promise<ActionResult> {
  try {
    if (!nombre?.trim()) return { ok: false, error: 'Nombre obligatorio' }
    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase.from('tallas').insert({
      tienda_id: tiendaId,
      nombre: nombre.trim(),
      orden,
      activo: true,
    })
    if (error) return { ok: false, error: error.message }
    revalidatePath('/productos/tallas')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function actualizarTalla(
  id: string,
  nombre: string,
  orden: number
): Promise<ActionResult> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase
      .from('tallas')
      .update({ nombre: nombre.trim(), orden })
      .eq('id', id)
      .eq('tienda_id', tiendaId)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/productos/tallas')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function eliminarTalla(id: string): Promise<ActionResult> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase
      .from('tallas')
      .update({ activo: false })
      .eq('id', id)
      .eq('tienda_id', tiendaId)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/productos/tallas')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// =============================================================
// TAXONOMÍAS — Colores
// =============================================================

export async function crearColor(nombre: string, hex?: string): Promise<ActionResult> {
  try {
    if (!nombre?.trim()) return { ok: false, error: 'Nombre obligatorio' }
    if (hex && !/^#[0-9A-Fa-f]{6}$/.test(hex))
      return { ok: false, error: 'Hex inválido (formato #RRGGBB)' }
    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase.from('colores').insert({
      tienda_id: tiendaId,
      nombre: nombre.trim(),
      hex_color: hex || null,
      activo: true,
    })
    if (error) return { ok: false, error: error.message }
    revalidatePath('/productos/colores')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function actualizarColor(
  id: string,
  nombre: string,
  hex?: string
): Promise<ActionResult> {
  try {
    if (hex && !/^#[0-9A-Fa-f]{6}$/.test(hex))
      return { ok: false, error: 'Hex inválido (formato #RRGGBB)' }
    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase
      .from('colores')
      .update({ nombre: nombre.trim(), hex_color: hex || null })
      .eq('id', id)
      .eq('tienda_id', tiendaId)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/productos/colores')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function eliminarColor(id: string): Promise<ActionResult> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase
      .from('colores')
      .update({ activo: false })
      .eq('id', id)
      .eq('tienda_id', tiendaId)
    if (error) return { ok: false, error: error.message }
    revalidatePath('/productos/colores')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// =============================================================
// TAXONOMÍAS — Creación inline (retornan el item creado con su id)
// Usadas desde el formulario de producto sin salir de la pantalla.
// =============================================================

export async function crearCategoriaInline(
  nombre: string
): Promise<ActionResult<{ id: string; nombre: string }>> {
  try {
    if (!nombre?.trim()) return { ok: false, error: 'Nombre obligatorio' }
    const { supabase, tiendaId } = await requireTiendaId()
    const { data, error } = await supabase
      .from('categorias')
      .insert({ tienda_id: tiendaId, nombre: nombre.trim(), activo: true })
      .select('id, nombre')
      .single()
    if (error) return { ok: false, error: error.message }
    revalidatePath('/productos/categorias')
    revalidatePath('/productos')
    return { ok: true, data: { id: data.id, nombre: data.nombre } }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function crearTallaInline(
  nombre: string
): Promise<ActionResult<{ id: string; nombre: string }>> {
  try {
    if (!nombre?.trim()) return { ok: false, error: 'Nombre obligatorio' }
    const { supabase, tiendaId } = await requireTiendaId()
    const { data, error } = await supabase
      .from('tallas')
      .insert({ tienda_id: tiendaId, nombre: nombre.trim(), orden: 0, activo: true })
      .select('id, nombre')
      .single()
    if (error) return { ok: false, error: error.message }
    revalidatePath('/productos/tallas')
    return { ok: true, data: { id: data.id, nombre: data.nombre } }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function crearColorInline(
  nombre: string,
  hex?: string
): Promise<ActionResult<{ id: string; nombre: string; hex_color: string | null }>> {
  try {
    if (!nombre?.trim()) return { ok: false, error: 'Nombre obligatorio' }
    if (hex && !/^#[0-9A-Fa-f]{6}$/.test(hex))
      return { ok: false, error: 'Color hex inválido' }
    const { supabase, tiendaId } = await requireTiendaId()
    const { data, error } = await supabase
      .from('colores')
      .insert({ tienda_id: tiendaId, nombre: nombre.trim(), hex_color: hex || null, activo: true })
      .select('id, nombre, hex_color')
      .single()
    if (error) return { ok: false, error: error.message }
    revalidatePath('/productos/colores')
    return { ok: true, data: { id: data.id, nombre: data.nombre, hex_color: data.hex_color } }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// =============================================================
// HELPERS
// =============================================================

function traducirError(msg: string): string {
  if (/duplicate key|unique constraint/i.test(msg)) {
    if (/codigo_barras/i.test(msg)) return 'Ese código de barras ya existe en otra variante'
    if (/variantes_unicas/i.test(msg))
      return 'Ya existe una variante con esa combinación de talla y color'
    return 'Conflicto de unicidad: el dato ya existe'
  }
  return msg
}

// Re-export helper para usar en server components que necesiten redirect
export async function redirectAProducto(id: string): Promise<never> {
  redirect(`/productos/${id}`)
}
