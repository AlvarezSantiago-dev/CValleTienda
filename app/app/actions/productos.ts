'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { generateEAN13 } from '@/lib/barcode'
import { getContextoTienda } from '@/lib/supabase/context'
import { LIMITES_BASICO } from '@/lib/planes/config'
import { titleCase } from '@/lib/utils/text'
import { esStockInfinito, esStockValido, STOCK_INFINITO } from '@/lib/stock/infinito'
import { rubroPermiteStockInfinito } from '@/lib/rubro/config'

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
  // Pack / bulto
  pack_habilitado?: boolean
  pack_cantidad?: number | null   // requerido si pack_habilitado=true
  pack_precio?: number | null     // requerido si pack_habilitado=true
  pack_codigo_barras?: string | null
  /** Foto de la variante (por color). La persiste `/api/productos/imagen`, no este action. */
  imagen_url?: string | null
}

export interface KitComponenteInput {
  componente_variante_id: string
  cantidad: number
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
  es_bundle?: boolean
  es_kit?: boolean
  recargo_cc_pct?: number | null
  visible_en_catalogo?: boolean
  /** Componentes por variante. Clave = índice de variante (para nuevas) o variante_id (para existentes) */
  kit_componentes_por_variante?: Record<string, KitComponenteInput[]>
}

export interface ActionResult<T = unknown> {
  ok: boolean
  error?: string
  data?: T
}

// =============================================================
// HELPERS DE AUTH
// =============================================================

function sanitizarImagenUrl(url: string | null | undefined): string | null {
  const t = url?.trim()
  if (!t) return null
  if (!/^https?:\/\//i.test(t)) return null
  return t
}

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

function validarProducto(input: ProductoInput, permiteInfinito = false): string | null {
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
    if (!esStockValido(v.stock_inicial)) {
      return permiteInfinito
        ? 'Stock inicial debe ser ≥ 0, o -1 para ilimitado'
        : 'Stock inicial no puede ser negativo'
    }
    if (esStockInfinito(v.stock_inicial) && !permiteInfinito) {
      return 'Stock ilimitado (-1) solo está disponible para despensa y carnicería'
    }
    if (v.stock_minimo < 0) return 'Stock mínimo no puede ser negativo'
    if (v.precio_venta != null && v.precio_venta < 0) return 'Precio de variante inválido'
    const tieneCodigoPos =
      !!v.codigo_barras?.trim() ||
      (v.pack_habilitado && !!v.pack_codigo_barras?.trim())
    if (!tieneCodigoPos)
      return 'Cada variante debe tener código de unidad o de pack para el POS'
    if (v.codigo_barras?.trim()) {
      if (!/^[0-9A-Za-z\-]{4,32}$/.test(v.codigo_barras))
        return `Código de barras inválido: ${v.codigo_barras}`
    }
    if (v.pack_codigo_barras?.trim()) {
      if (!/^[0-9A-Za-z\-]{4,32}$/.test(v.pack_codigo_barras))
        return `Código de pack inválido: ${v.pack_codigo_barras}`
    }
    if (v.pack_habilitado) {
      if (!v.pack_cantidad || v.pack_cantidad <= 1)
        return 'La cantidad del pack debe ser mayor a 1'
      if (!v.pack_precio || v.pack_precio <= 0)
        return 'El precio del pack es obligatorio'
    }
  }
  return null
}

// =============================================================
// CREAR PRODUCTO
// =============================================================

export async function crearProducto(input: ProductoInput): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getContextoTienda()
    const permiteInfinito = rubroPermiteStockInfinito(ctx?.rubro)
    const err = validarProducto(input, permiteInfinito)
    if (err) return { ok: false, error: err }

    const { supabase, tiendaId, userId } = await requireTiendaId()

    // Guard: límite de productos en plan Básico
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
        imagen_url: sanitizarImagenUrl(input.imagen_url),
        es_bundle: input.es_bundle ?? false,
        es_kit: input.es_kit ?? false,
        recargo_cc_pct: input.recargo_cc_pct ?? null,
        visible_en_catalogo: input.es_kit || input.es_bundle ? false : (input.visible_en_catalogo ?? false),
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
      pack_habilitado: v.pack_habilitado ?? false,
      pack_cantidad: v.pack_habilitado ? (v.pack_cantidad ?? null) : null,
      pack_precio: v.pack_habilitado ? (v.pack_precio ?? null) : null,
      pack_codigo_barras: v.pack_habilitado ? (v.pack_codigo_barras?.trim() || null) : null,
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

    // Guardar componentes de kit si es un kit
    if (input.es_kit && input.kit_componentes_por_variante && variantesInsertadas) {
      const compInserts: object[] = []
      variantesActivas.forEach((v, idx) => {
        const varianteId = variantesInsertadas[idx]?.id
        if (!varianteId) return
        const comps = input.kit_componentes_por_variante?.[String(idx)] ?? []
        for (const c of comps) {
          if (!c.componente_variante_id || c.cantidad <= 0) continue
          compInserts.push({
            tienda_id: tiendaId,
            kit_variante_id: varianteId,
            componente_variante_id: c.componente_variante_id,
            cantidad: c.cantidad,
          })
        }
      })
      if (compInserts.length > 0) {
        const { error: kitErr } = await supabase.from('kit_componentes').insert(compInserts)
        if (kitErr) {
          await supabase.from('productos').delete().eq('id', productoId)
          return { ok: false, error: `Error al guardar componentes del kit: ${kitErr.message}` }
        }
      }
    }

    // Insertar movimientos de stock inicial para variantes con stock > 0 o ilimitado
    const movimientos = (variantesInsertadas ?? [])
      .filter((v) => v.stock_actual > 0 || esStockInfinito(v.stock_actual))
      .map((v) => ({
        tienda_id: tiendaId,
        variante_id: v.id,
        tipo: 'inicial' as const,
        cantidad: esStockInfinito(v.stock_actual) ? STOCK_INFINITO : v.stock_actual,
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
    const ctx = await getContextoTienda()
    const permiteInfinito = rubroPermiteStockInfinito(ctx?.rubro)
    const err = validarProducto(input, permiteInfinito)
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
        imagen_url: sanitizarImagenUrl(input.imagen_url),
        es_kit: input.es_kit ?? false,
        recargo_cc_pct: input.recargo_cc_pct ?? null,
        visible_en_catalogo:
          input.es_kit || input.es_bundle ? false : (input.visible_en_catalogo ?? false),
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
          .update({
            activo: false,
            codigo_barras: null,
            pack_codigo_barras: null,
          })
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
            pack_habilitado: v.pack_habilitado ?? false,
            pack_cantidad: v.pack_habilitado ? (v.pack_cantidad ?? null) : null,
            pack_precio: v.pack_habilitado ? (v.pack_precio ?? null) : null,
            pack_codigo_barras: v.pack_habilitado ? (v.pack_codigo_barras?.trim() || null) : null,
          })
          .eq('id', v.id)
          .eq('tienda_id', tiendaId)
        if (uErr) return { ok: false, error: traducirError(uErr.message) }
      } else {
        // Variante nueva — primero verificar si existe una inactiva con misma combinación
        // (el soft-delete deja la fila con activo=false y la constraint unique sigue activa)
        const tallaIdNueva = v.talla_id || null
        const colorIdNueva = v.color_id || null

        let queryExistente = supabase
          .from('variantes_producto')
          .select('id, stock_actual')
          .eq('tienda_id', tiendaId)
          .eq('producto_id', id)
          .eq('activo', false)

        if (tallaIdNueva) {
          queryExistente = queryExistente.eq('talla_id', tallaIdNueva)
        } else {
          queryExistente = queryExistente.is('talla_id', null)
        }
        if (colorIdNueva) {
          queryExistente = queryExistente.eq('color_id', colorIdNueva)
        } else {
          queryExistente = queryExistente.is('color_id', null)
        }

        const { data: varianteInactiva } = await queryExistente.maybeSingle()

        let varianteId: string | null = null

        if (varianteInactiva) {
          // Reactivar la variante existente en lugar de insertar
          const { error: reactivarErr } = await supabase
            .from('variantes_producto')
            .update({
              codigo_barras: v.codigo_barras?.trim() || null,
              precio_venta: v.precio_venta,
              stock_minimo: v.stock_minimo,
              activo: true,
              pack_habilitado: v.pack_habilitado ?? false,
              pack_cantidad: v.pack_habilitado ? (v.pack_cantidad ?? null) : null,
              pack_precio: v.pack_habilitado ? (v.pack_precio ?? null) : null,
              pack_codigo_barras: v.pack_habilitado ? (v.pack_codigo_barras?.trim() || null) : null,
            })
            .eq('id', varianteInactiva.id)
            .eq('tienda_id', tiendaId)
          if (reactivarErr) return { ok: false, error: traducirError(reactivarErr.message) }
          varianteId = varianteInactiva.id
          // Si se especifica stock inicial, registrar como ingreso
          if (v.stock_inicial > 0) {
            const stockAnterior = Number(varianteInactiva.stock_actual ?? 0)
            await supabase.from('movimientos_stock').insert({
              tienda_id: tiendaId,
              variante_id: varianteId,
              tipo: 'entrada',
              cantidad: v.stock_inicial,
              stock_anterior: stockAnterior,
              stock_posterior: stockAnterior + v.stock_inicial,
              motivo: 'Reactivación de variante',
              venta_id: null,
              usuario_id: userId,
            })
            await supabase
              .from('variantes_producto')
              .update({ stock_actual: stockAnterior + v.stock_inicial })
              .eq('id', varianteId)
              .eq('tienda_id', tiendaId)
          }
        } else {
          // Insertar variante nueva
          const { data: nueva, error: iErr } = await supabase
            .from('variantes_producto')
            .insert({
              tienda_id: tiendaId,
              producto_id: id,
              talla_id: tallaIdNueva,
              color_id: colorIdNueva,
              codigo_barras: v.codigo_barras?.trim() || null,
              precio_venta: v.precio_venta,
              stock_actual: v.stock_inicial,
              stock_minimo: v.stock_minimo,
              activo: true,
              pack_habilitado: v.pack_habilitado ?? false,
              pack_cantidad: v.pack_habilitado ? (v.pack_cantidad ?? null) : null,
              pack_precio: v.pack_habilitado ? (v.pack_precio ?? null) : null,
              pack_codigo_barras: v.pack_habilitado ? (v.pack_codigo_barras?.trim() || null) : null,
            })
            .select('id')
            .single()

          if (iErr) return { ok: false, error: traducirError(iErr.message) }
          varianteId = nueva?.id ?? null

          if (varianteId && v.stock_inicial > 0) {
            await supabase.from('movimientos_stock').insert({
              tienda_id: tiendaId,
              variante_id: varianteId,
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
    }

    revalidatePath('/productos')
    revalidatePath(`/productos/${id}`)

    // Guardar/actualizar componentes de kit si es un kit
    if (input.es_kit && input.kit_componentes_por_variante) {
      for (const [varianteKey, comps] of Object.entries(input.kit_componentes_por_variante)) {
        if (!varianteKey) continue
        // Borrar componentes previos de esta variante
        await supabase
          .from('kit_componentes')
          .delete()
          .eq('kit_variante_id', varianteKey)
          .eq('tienda_id', tiendaId)
        // Insertar los nuevos
        if (comps.length > 0) {
          const rows = comps
            .filter((c) => c.componente_variante_id && c.cantidad > 0)
            .map((c) => ({
              tienda_id: tiendaId,
              kit_variante_id: varianteKey,
              componente_variante_id: c.componente_variante_id,
              cantidad: c.cantidad,
            }))
          if (rows.length > 0) {
            await supabase.from('kit_componentes').insert(rows)
          }
        }
      }
    } else if (!input.es_kit) {
      // Si se quitó el flag de kit, limpiar componentes de todas las variantes del producto
      const { data: vars } = await supabase
        .from('variantes_producto')
        .select('id')
        .eq('producto_id', id)
        .eq('tienda_id', tiendaId)
      if (vars && vars.length > 0) {
        await supabase
          .from('kit_componentes')
          .delete()
          .in('kit_variante_id', vars.map((v) => v.id))
          .eq('tienda_id', tiendaId)
      }
    }

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
      .update({
        activo: false,
        codigo_barras: null,
        pack_codigo_barras: null,
      })
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
async function _generarCodigoBarrasUnicoInterno(
  supabase: Awaited<ReturnType<typeof requireTiendaId>>['supabase'],
  tiendaId: string
): Promise<ActionResult<{ codigo: string }>> {
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
}

export async function generarCodigoBarrasUnico(): Promise<ActionResult<{ codigo: string }>> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()
    return _generarCodigoBarrasUnicoInterno(supabase, tiendaId)
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/**
 * Genera N códigos EAN-13 únicos en un solo round-trip (máx. 50).
 */
export async function generarCodigosBarrasBatch(
  cantidad: number
): Promise<ActionResult<{ codigos: string[] }>> {
  if (cantidad < 1 || cantidad > 50) {
    return { ok: false, error: 'La cantidad debe estar entre 1 y 50' }
  }
  try {
    const { supabase, tiendaId } = await requireTiendaId()
    const codigos: string[] = []
    const usados = new Set<string>()

    for (let n = 0; n < cantidad; n++) {
      let asignado = false
      for (let intento = 0; intento < 12; intento++) {
        const res = await _generarCodigoBarrasUnicoInterno(supabase, tiendaId)
        if (!res.ok || !res.data) continue
        const { codigo } = res.data
        if (usados.has(codigo)) continue
        usados.add(codigo)
        codigos.push(codigo)
        asignado = true
        break
      }
      if (!asignado) {
        return { ok: false, error: 'No se pudieron generar todos los códigos, reintentá' }
      }
    }

    return { ok: true, data: { codigos } }
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
): Promise<ActionResult<{ producto_id: string; variante_id: string; es_pack_codigo: boolean } | null>> {
  try {
    const c = codigo.trim()
    if (!c) return { ok: true, data: null }
    const { supabase, tiendaId } = await requireTiendaId()
    const { data, error } = await supabase
      .from('variantes_producto')
      .select('id, producto_id')
      .eq('tienda_id', tiendaId)
      .eq('codigo_barras', c)
      .eq('activo', true)
      .maybeSingle()
    if (error) return { ok: false, error: error.message }
    if (data) {
      return {
        ok: true,
        data: {
          producto_id: data.producto_id as string,
          variante_id: data.id as string,
          es_pack_codigo: false,
        },
      }
    }

    const { data: pack, error: packError } = await supabase
      .from('variantes_producto')
      .select('id, producto_id')
      .eq('tienda_id', tiendaId)
      .eq('pack_codigo_barras', c)
      .eq('pack_habilitado', true)
      .eq('activo', true)
      .maybeSingle()
    if (packError) return { ok: false, error: packError.message }
    if (!pack) return { ok: true, data: null }
    return {
      ok: true,
      data: {
        producto_id: pack.producto_id as string,
        variante_id: pack.id as string,
        es_pack_codigo: true,
      },
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export interface VarianteParaAsociar {
  id: string
  producto_id: string
  producto_nombre: string
  talla: string | null
  color: string | null
  codigo_barras: string | null
  precio_venta: number
  pack_habilitado: boolean
  pack_cantidad: number | null
  pack_precio: number | null
  pack_codigo_barras: string | null
}

/** Busca variantes activas para asociarles un código escaneado. */
export async function buscarVariantesParaAsociar(
  query: string
): Promise<ActionResult<VarianteParaAsociar[]>> {
  try {
    const q = query.trim()
    if (q.length < 2) return { ok: true, data: [] }
    const { supabase, tiendaId } = await requireTiendaId()
    const pattern = `%${q.replace(/[%_]/g, '\\$&')}%`

    const [{ data: productos }, { data: variantesPorCodigo }] = await Promise.all([
      supabase
        .from('productos')
        .select('id')
        .eq('tienda_id', tiendaId)
        .eq('activo', true)
        .or(`nombre.ilike.${pattern},codigo_base.ilike.${pattern}`)
        .limit(20),
      supabase
        .from('variantes_producto')
        .select('producto_id')
        .eq('tienda_id', tiendaId)
        .eq('activo', true)
        .or(`codigo_barras.ilike.${pattern},pack_codigo_barras.ilike.${pattern}`)
        .limit(20),
    ])

    const productoIds = Array.from(
      new Set([
        ...((productos ?? []) as Array<{ id: string }>).map((p) => p.id),
        ...((variantesPorCodigo ?? []) as Array<{ producto_id: string }>).map((v) => v.producto_id),
      ])
    ).slice(0, 20)
    if (productoIds.length === 0) return { ok: true, data: [] }

    const { data, error } = await supabase
      .from('variantes_producto')
      .select(
        'id, producto_id, codigo_barras, precio_venta, pack_habilitado, pack_cantidad, pack_precio, pack_codigo_barras, ' +
          'producto:productos!inner(nombre, activo, precio_venta), talla:tallas(nombre), color:colores(nombre)'
      )
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .eq('producto.activo', true)
      .in('producto_id', productoIds)
      .limit(50)
    if (error) return { ok: false, error: error.message }

    const result = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
      const producto = (Array.isArray(row.producto) ? row.producto[0] : row.producto) as
        | Record<string, unknown>
        | null
      const talla = (Array.isArray(row.talla) ? row.talla[0] : row.talla) as
        | Record<string, unknown>
        | null
      const color = (Array.isArray(row.color) ? row.color[0] : row.color) as
        | Record<string, unknown>
        | null
      const precioVar = row.precio_venta != null ? Number(row.precio_venta) : null
      const precioProd =
        producto?.precio_venta != null ? Number(producto.precio_venta as number) : 0
      const precio =
        precioVar != null && precioVar > 0 ? precioVar : precioProd
      return {
        id: row.id as string,
        producto_id: row.producto_id as string,
        producto_nombre: (producto?.nombre as string) ?? 'Producto',
        talla: (talla?.nombre as string | null) ?? null,
        color: (color?.nombre as string | null) ?? null,
        codigo_barras: (row.codigo_barras as string | null) ?? null,
        precio_venta: precio,
        pack_habilitado: Boolean(row.pack_habilitado),
        pack_cantidad: row.pack_cantidad == null ? null : Number(row.pack_cantidad),
        pack_precio: row.pack_precio != null ? Number(row.pack_precio) : null,
        pack_codigo_barras: (row.pack_codigo_barras as string | null) ?? null,
      } satisfies VarianteParaAsociar
    })
    return { ok: true, data: result }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export async function asociarCodigoAVariante(input: {
  varianteId: string
  codigo: string
  rol: 'unidad' | 'pack'
  /** Si el pack no está activo, habilitarlo con estos datos al asociar el código. */
  habilitarPack?: { pack_cantidad: number; pack_precio: number }
}): Promise<ActionResult<{ producto_id: string; variante_id: string }>> {
  try {
    const codigo = input.codigo.trim()
    if (!/^[0-9A-Za-z_-]{4,32}$/.test(codigo)) {
      return { ok: false, error: 'El código debe tener entre 4 y 32 caracteres válidos' }
    }

    const { supabase, tiendaId } = await requireTiendaId()
    const { data: variante, error } = await supabase
      .from('variantes_producto')
      .select('id, producto_id, codigo_barras, pack_habilitado, pack_codigo_barras')
      .eq('id', input.varianteId)
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .maybeSingle()
    if (error) return { ok: false, error: error.message }
    if (!variante) return { ok: false, error: 'La variante no existe o está inactiva' }

    const [{ data: usadoUnidad }, { data: usadoPack }] = await Promise.all([
      supabase
        .from('variantes_producto')
        .select('id, producto_id')
        .eq('tienda_id', tiendaId)
        .eq('activo', true)
        .eq('codigo_barras', codigo)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('variantes_producto')
        .select('id, producto_id')
        .eq('tienda_id', tiendaId)
        .eq('activo', true)
        .eq('pack_codigo_barras', codigo)
        .limit(1)
        .maybeSingle(),
    ])
    const usadoPor = (usadoUnidad?.id ?? usadoPack?.id) as string | undefined
    if (usadoPor && usadoPor !== variante.id) {
      const productoIdOtro = (usadoUnidad?.producto_id ?? usadoPack?.producto_id) as string
      const { data: otro } = await supabase
        .from('productos')
        .select('nombre')
        .eq('id', productoIdOtro)
        .maybeSingle()
      const hint = otro?.nombre ? ` (${otro.nombre})` : ''
      return {
        ok: false,
        error: `Ese código sigue en otra variante activa${hint}. Quitá el código en ese producto y guardá, o desactivá la variante.`,
      }
    }

    if (input.rol === 'unidad') {
      if (variante.codigo_barras && variante.codigo_barras !== codigo) {
        return {
          ok: false,
          error: 'La variante ya tiene un código de unidad. Podés asociar este código como pack.',
        }
      }
      if (variante.pack_codigo_barras === codigo) {
        return { ok: false, error: 'Ese código ya está usado como código de pack' }
      }
    } else {
      if (!variante.pack_habilitado) {
        const hp = input.habilitarPack
        if (!hp || hp.pack_cantidad <= 1 || hp.pack_precio <= 0) {
          return {
            ok: false,
            error: 'Indicá cantidad y precio del pack para activarlo al asociar el código',
          }
        }
      } else if (variante.pack_codigo_barras && variante.pack_codigo_barras !== codigo) {
        return { ok: false, error: 'La variante ya tiene un código de pack asociado' }
      }
      if (variante.codigo_barras === codigo) {
        // Pasará a pack: se quita de unidad al guardar abajo
      }
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (input.rol === 'unidad') {
      updatePayload.codigo_barras = codigo
    } else {
      updatePayload.pack_codigo_barras = codigo
      if (variante.codigo_barras === codigo) {
        updatePayload.codigo_barras = null
      }
      if (!variante.pack_habilitado && input.habilitarPack) {
        updatePayload.pack_habilitado = true
        updatePayload.pack_cantidad = input.habilitarPack.pack_cantidad
        updatePayload.pack_precio = input.habilitarPack.pack_precio
      }
    }

    const { error: updateError } = await supabase
      .from('variantes_producto')
      .update(updatePayload)
      .eq('id', variante.id)
      .eq('tienda_id', tiendaId)
    if (updateError) return { ok: false, error: traducirError(updateError.message) }

    revalidatePath('/productos')
    revalidatePath('/pos')
    return {
      ok: true,
      data: {
        producto_id: variante.producto_id as string,
        variante_id: variante.id as string,
      },
    }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

// =============================================================
// BÚSQUEDA DE VARIANTES PARA SELECTOR DE KIT
// =============================================================

export interface VarianteKitResult {
  id: string
  producto_id: string
  producto_nombre: string
  talla: string | null
  color: string | null
  color_hex: string | null
  codigo_barras: string | null
  stock_actual: number
  precio_venta: number
}

/**
 * Busca variantes activas para usar como componentes de un kit.
 * Excluye kits (no se pueden anidar kits).
 */
export async function buscarVariantesParaKit(
  query: string
): Promise<ActionResult<VarianteKitResult[]>> {
  try {
    const q = query.trim()
    if (!q || q.length < 2) return { ok: true, data: [] }
    const { supabase, tiendaId } = await requireTiendaId()

    const pattern = `%${q.replace(/[%_]/g, '\\$&')}%`

    // Buscar productos activos no-kit que coincidan con el query
    const { data: prodIds } = await supabase
      .from('productos')
      .select('id')
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .eq('es_kit', false)
      .or(`nombre.ilike.${pattern},codigo_base.ilike.${pattern}`)
      .limit(30)

    const ids = ((prodIds ?? []) as Array<{ id: string }>).map((p) => p.id)
    if (ids.length === 0) return { ok: true, data: [] }

    const { data, error } = await supabase
      .from('variantes_producto')
      .select(
        'id, producto_id, codigo_barras, precio_venta, stock_actual, ' +
          'producto:productos!inner(nombre, precio_venta), ' +
          'talla:tallas(nombre), color:colores(nombre, hex_color)'
      )
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .in('producto_id', ids)
      .limit(50)

    if (error) return { ok: false, error: error.message }

    const result: VarianteKitResult[] = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => {
      const prod = (Array.isArray(r.producto) ? r.producto[0] : r.producto) as Record<string, unknown> | null
      const talla = (Array.isArray(r.talla) ? r.talla[0] : r.talla) as Record<string, unknown> | null
      const color = (Array.isArray(r.color) ? r.color[0] : r.color) as Record<string, unknown> | null
      const precioVar = r.precio_venta != null ? Number(r.precio_venta) : null
      const precioProd = prod?.precio_venta != null ? Number(prod.precio_venta as number) : 0
      return {
        id: r.id as string,
        producto_id: r.producto_id as string,
        producto_nombre: (prod?.nombre as string) ?? 'Producto',
        talla: (talla?.nombre as string | null) ?? null,
        color: (color?.nombre as string | null) ?? null,
        color_hex: (color?.hex_color as string | null) ?? null,
        codigo_barras: (r.codigo_barras as string | null) ?? null,
        stock_actual: Number(r.stock_actual ?? 0),
        precio_venta: precioVar != null && precioVar > 0 ? precioVar : precioProd,
      }
    })

    return { ok: true, data: result }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// Resultado de un producto con todas sus variantes (para auto-asignación de kit)
export interface VarianteParaKitItem {
  id: string
  talla_id: string | null
  talla_nombre: string | null
  color_id: string | null
  color_nombre: string | null
  color_hex: string | null
  stock_actual: number
  precio_venta: number | null
  codigo_barras: string | null
}

export interface ProductoParaKitResult {
  id: string
  nombre: string
  variantes: VarianteParaKitItem[]
}

export async function buscarProductosParaKit(
  query: string
): Promise<ActionResult<ProductoParaKitResult[]>> {
  try {
    const q = query.trim()
    if (!q || q.length < 2) return { ok: true, data: [] }
    const { supabase, tiendaId } = await requireTiendaId()

    const pattern = `%${q.replace(/[%_]/g, '\\$&')}%`

    const { data, error } = await supabase
      .from('productos')
      .select(
        'id, nombre, ' +
          'variantes_producto(id, talla_id, color_id, stock_actual, precio_venta, codigo_barras, ' +
          'talla:tallas(id, nombre), color:colores(id, nombre, hex_color))'
      )
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .eq('es_kit', false)
      .or(`nombre.ilike.${pattern},codigo_base.ilike.${pattern}`)
      .eq('variantes_producto.activo', true)
      .limit(10)

    if (error) return { ok: false, error: error.message }

    const result: ProductoParaKitResult[] = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((p) => {
      const variantes = ((p.variantes_producto as unknown[]) ?? []) as Array<Record<string, unknown>>
      return {
        id: p.id as string,
        nombre: p.nombre as string,
        variantes: variantes.map((v) => {
          const talla = (Array.isArray(v.talla) ? v.talla[0] : v.talla) as Record<string, unknown> | null
          const color = (Array.isArray(v.color) ? v.color[0] : v.color) as Record<string, unknown> | null
          return {
            id: v.id as string,
            talla_id: (v.talla_id as string | null) ?? null,
            talla_nombre: (talla?.nombre as string | null) ?? null,
            color_id: (v.color_id as string | null) ?? null,
            color_nombre: (color?.nombre as string | null) ?? null,
            color_hex: (color?.hex_color as string | null) ?? null,
            stock_actual: Number(v.stock_actual ?? 0),
            precio_venta: v.precio_venta != null ? Number(v.precio_venta) : null,
            codigo_barras: (v.codigo_barras as string | null) ?? null,
          }
        }),
      }
    })

    return { ok: true, data: result }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// =============================================================
// WIZARD "NUEVO CONJUNTO" — crea piezas + kit en una sola llamada
// =============================================================

export interface PiezaConjuntoInput {
  nombre: string
  precio_venta: number
  precio_compra: number
  categoria_id: string | null
  stock_por_variante: Record<string, number> // key: "${talla_id}__${color_id}"
}

export interface ConjuntoInput {
  nombre: string
  precio_venta: number
  precio_compra: number
  categoria_id: string | null
  variantes: Array<{ talla_id: string | null; color_id: string | null }>
  piezas: PiezaConjuntoInput[]
}

export async function crearConjuntoCompleto(
  input: ConjuntoInput
): Promise<ActionResult<{ productoId: string }>> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()

    if (!input.nombre.trim()) return { ok: false, error: 'El nombre del conjunto es requerido.' }
    if (input.piezas.length === 0) return { ok: false, error: 'Agregá al menos una pieza al conjunto.' }
    if (input.variantes.length === 0) return { ok: false, error: 'Definí al menos una variante (talla/color).' }

    // Estructura: por cada combinación (talla, color), guardamos el varianteId de cada pieza
    // variantesCreadas[varKey] = [{ productoId, varianteId }]
    const variantesCreadas: Record<string, Array<{ productoId: string; varianteId: string }>> = {}

    // 1. Crear cada producto pieza con sus variantes
    for (const pieza of input.piezas) {
      const { data: prod, error: prodErr } = await supabase
        .from('productos')
        .insert({
          tienda_id: tiendaId,
          nombre: pieza.nombre.trim(),
          precio_venta: pieza.precio_venta,
          precio_compra: pieza.precio_compra,
          categoria_id: pieza.categoria_id,
          es_kit: false,
          activo: true,
          unidad_de_medida: 'unidad',
        })
        .select('id')
        .single()

      if (prodErr || !prod) throw new Error(`Error creando pieza "${pieza.nombre}": ${prodErr?.message}`)

      for (const { talla_id, color_id } of input.variantes) {
        const varKey = `${talla_id ?? 'null'}__${color_id ?? 'null'}`
        const stock = pieza.stock_por_variante[varKey] ?? 0

        const { data: variante, error: varErr } = await supabase
          .from('variantes_producto')
          .insert({
            tienda_id: tiendaId,
            producto_id: prod.id,
            talla_id: talla_id ?? null,
            color_id: color_id ?? null,
            stock_actual: stock,
            stock_minimo: 0,
            activo: true,
          })
          .select('id')
          .single()

        if (varErr || !variante) throw new Error(`Error creando variante de pieza: ${varErr?.message}`)

        if (!variantesCreadas[varKey]) variantesCreadas[varKey] = []
        variantesCreadas[varKey].push({ productoId: prod.id, varianteId: variante.id })

        if (stock > 0) {
          await supabase.from('movimientos_stock').insert({
            tienda_id: tiendaId,
            variante_id: variante.id,
            tipo: 'entrada',
            cantidad: stock,
            descripcion: 'Stock inicial conjunto',
          })
        }
      }
    }

    // 2. Crear el producto kit
    const { data: kit, error: kitErr } = await supabase
      .from('productos')
      .insert({
        tienda_id: tiendaId,
        nombre: input.nombre.trim(),
        precio_venta: input.precio_venta,
        precio_compra: input.precio_compra,
        categoria_id: input.categoria_id,
        es_kit: true,
        activo: true,
        unidad_de_medida: 'unidad',
      })
      .select('id')
      .single()

    if (kitErr || !kit) throw new Error(`Error creando kit: ${kitErr?.message}`)

    // 3. Crear variantes del kit y enlazar componentes
    for (const { talla_id, color_id } of input.variantes) {
      const { data: kitVar, error: kvErr } = await supabase
        .from('variantes_producto')
        .insert({
          tienda_id: tiendaId,
          producto_id: kit.id,
          talla_id: talla_id ?? null,
          color_id: color_id ?? null,
          stock_actual: 0,
          stock_minimo: 0,
          activo: true,
        })
        .select('id')
        .single()

      if (kvErr || !kitVar) throw new Error(`Error creando variante kit: ${kvErr?.message}`)

      const varKey = `${talla_id ?? 'null'}__${color_id ?? 'null'}`
      const piezasDeEstaVariante = variantesCreadas[varKey] ?? []

      for (const { varianteId } of piezasDeEstaVariante) {
        await supabase.from('kit_componentes').insert({
          tienda_id: tiendaId,
          kit_variante_id: kitVar.id,
          componente_variante_id: varianteId,
          cantidad: 1,
        })
      }
    }

    return { ok: true, data: { productoId: kit.id } }
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
  const ctx = await getContextoTienda()
  const permiteInfinito = rubroPermiteStockInfinito(ctx?.rubro)

  const MAX_FILAS = 500
  if (filas.length > MAX_FILAS) {
    return {
      ok: false,
      total: filas.length,
      exitosos: 0,
      errores: [{ fila: 0, nombre: '', ok: false, error: `Máximo ${MAX_FILAS} filas por importación` }],
    }
  }

  for (let i = 0; i < filas.length; i++) {
    const stock = Number(filas[i].stock_actual)
    if (!esStockValido(stock)) {
      return {
        ok: false,
        total: filas.length,
        exitosos: 0,
        errores: [{
          fila: i + 2,
          nombre: filas[i].nombre,
          ok: false,
          error: permiteInfinito
            ? 'stock_actual debe ser ≥ 0, o -1 para ilimitado'
            : 'stock_actual no puede ser negativo',
        }],
      }
    }
    if (esStockInfinito(stock) && !permiteInfinito) {
      return {
        ok: false,
        total: filas.length,
        exitosos: 0,
        errores: [{
          fila: i + 2,
          nombre: filas[i].nombre,
          ok: false,
          error: 'Stock ilimitado (-1) solo está disponible para despensa y carnicería',
        }],
      }
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
        .filter((v) => v.stock_actual > 0 || esStockInfinito(v.stock_actual))
        .map((v) => ({
          tienda_id: tiendaId,
          variante_id: v.id,
          tipo: 'inicial' as const,
          cantidad: esStockInfinito(v.stock_actual) ? STOCK_INFINITO : v.stock_actual,
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
      nombre: titleCase(nombre),
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
      .update({ nombre: titleCase(nombre), descripcion: descripcion?.trim() || null })
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
      nombre: titleCase(nombre),
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
      .update({ nombre: titleCase(nombre), hex_color: hex || null })
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

// NOTA: La normalización de casing en tallas es responsabilidad del componente
// (upperCaseTrim para ropa, titleCase para otros rubros). La action solo hace trim
// porque no tiene contexto del rubro sin una query extra.
export async function crearCategoriaInline(
  nombre: string
): Promise<ActionResult<{ id: string; nombre: string }>> {
  try {
    if (!nombre?.trim()) return { ok: false, error: 'Nombre obligatorio' }
    const { supabase, tiendaId } = await requireTiendaId()
    const { data, error } = await supabase
      .from('categorias')
      .insert({ tienda_id: tiendaId, nombre: titleCase(nombre), activo: true })
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
      .insert({ tienda_id: tiendaId, nombre: titleCase(nombre), hex_color: hex || null, activo: true })
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

// =============================================================
// DATOS PARA WIZARD DE VOZ
// =============================================================

import type { Talla, Color, Categoria } from '@/types/database'

export interface DatosVozResult {
  tallas: Talla[]
  colores: Color[]
  categorias: Categoria[]
}

/**
 * Retorna tallas, colores y categorías activas de la tienda.
 * Se llama una sola vez al iniciar el flujo de voz (lazy).
 */
export async function obtenerDatosParaVoz(): Promise<DatosVozResult> {
  const { supabase, tiendaId } = await requireTiendaId()

  const [tallasRes, coloresRes, categoriasRes] = await Promise.all([
    supabase
      .from('tallas')
      .select('id, tienda_id, nombre, orden, activo, created_at')
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .order('orden'),
    supabase
      .from('colores')
      .select('id, tienda_id, nombre, hex_color, activo, created_at')
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .order('nombre'),
    supabase
      .from('categorias')
      .select('id, tienda_id, nombre, descripcion, activo, created_at, updated_at')
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .order('nombre'),
  ])

  return {
    tallas: tallasRes.data ?? [],
    colores: coloresRes.data ?? [],
    categorias: categoriasRes.data ?? [],
  }
}

// =============================================================
// BUNDLES / PACKS
// =============================================================

export interface ComponenteBundleInput {
  componente_variante_id: string
  cantidad: number
}

export interface ComponenteBundleItem {
  id: string
  componente_variante_id: string
  cantidad: number
  nombre: string
  talla: string | null
  color: string | null
  codigo_barras: string | null
  stock_actual: number
  precio_compra: number
}

/**
 * Guarda los componentes de un bundle para una variante dada.
 * Si componentes está vacío, elimina todos los componentes y
 * desmarca el producto como bundle.
 */
export async function guardarComponentesBundle(
  productoId: string,
  varianteBundleId: string,
  componentes: ComponenteBundleInput[]
): Promise<ActionResult> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()

    // Verificar que la variante pertenece a la tienda y al producto
    const { data: varianteCheck } = await supabase
      .from('variantes_producto')
      .select('id, producto_id')
      .eq('id', varianteBundleId)
      .eq('tienda_id', tiendaId)
      .maybeSingle()

    if (!varianteCheck || varianteCheck.producto_id !== productoId) {
      return { ok: false, error: 'Variante no encontrada' }
    }

    // Validar que ningún componente es el mismo bundle (auto-referencia)
    if (componentes.some((c) => c.componente_variante_id === varianteBundleId)) {
      return { ok: false, error: 'Un bundle no puede referenciarse a sí mismo' }
    }

    // Validar cantidades
    if (componentes.some((c) => !Number.isFinite(c.cantidad) || c.cantidad <= 0)) {
      return { ok: false, error: 'La cantidad de cada componente debe ser mayor a 0' }
    }

    // Eliminar componentes anteriores
    await supabase
      .from('producto_componentes')
      .delete()
      .eq('variante_bundle_id', varianteBundleId)
      .eq('tienda_id', tiendaId)

    if (componentes.length > 0) {
      const rows = componentes.map((c) => ({
        tienda_id: tiendaId,
        variante_bundle_id: varianteBundleId,
        componente_variante_id: c.componente_variante_id,
        cantidad: c.cantidad,
      }))
      const { error } = await supabase.from('producto_componentes').insert(rows)
      if (error) return { ok: false, error: error.message }
      // Marcar como bundle
      await supabase
        .from('productos')
        .update({ es_bundle: true })
        .eq('id', productoId)
        .eq('tienda_id', tiendaId)
    } else {
      // Sin componentes → ya no es bundle
      await supabase
        .from('productos')
        .update({ es_bundle: false })
        .eq('id', productoId)
        .eq('tienda_id', tiendaId)
    }

    revalidatePath(`/productos/${productoId}`)
    revalidatePath('/productos')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/**
 * Obtiene los componentes de un bundle para una variante dada.
 * Devuelve datos enriquecidos para mostrar en la UI.
 */
export async function obtenerComponentesBundleAction(
  varianteBundleId: string
): Promise<ActionResult<ComponenteBundleItem[]>> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()

    const { data, error } = await supabase
      .from('producto_componentes')
      .select(
        'id, componente_variante_id, cantidad, ' +
          'componente:variantes_producto!componente_variante_id(' +
            'id, codigo_barras, stock_actual, precio_venta, ' +
            'producto:productos!inner(nombre, precio_compra), ' +
            'talla:tallas(nombre), color:colores(nombre)' +
          ')'
      )
      .eq('variante_bundle_id', varianteBundleId)
      .eq('tienda_id', tiendaId)
      .order('created_at', { ascending: true })

    if (error) return { ok: false, error: error.message }

    const items: ComponenteBundleItem[] = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => {
      const comp = (Array.isArray(row.componente) ? row.componente[0] : row.componente) as Record<string, unknown> | null
      const prod = comp ? (Array.isArray(comp.producto) ? comp.producto[0] : comp.producto) as Record<string, unknown> | null : null
      const talla = comp ? (Array.isArray(comp.talla) ? comp.talla[0] : comp.talla) as Record<string, unknown> | null : null
      const color = comp ? (Array.isArray(comp.color) ? comp.color[0] : comp.color) as Record<string, unknown> | null : null

      return {
        id: row.id as string,
        componente_variante_id: row.componente_variante_id as string,
        cantidad: Number(row.cantidad),
        nombre: (prod?.nombre as string) ?? 'Producto',
        talla: (talla?.nombre as string | null) ?? null,
        color: (color?.nombre as string | null) ?? null,
        codigo_barras: (comp?.codigo_barras as string | null) ?? null,
        stock_actual: Number(comp?.stock_actual ?? 0),
        precio_compra: Number(prod?.precio_compra ?? 0),
      }
    })

    return { ok: true, data: items }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/**
 * Busca variantes para usar como componente de un bundle.
 * Excluye bundles (no se permiten bundles anidados).
 */
export async function buscarVariantesParaBundle(
  query: string,
  excludeVarianteId?: string
): Promise<ActionResult<ComponenteBundleItem[]>> {
  try {
    if (!query.trim()) return { ok: true, data: [] }
    const { supabase, tiendaId } = await requireTiendaId()

    const term = query.trim().replace(/[%_]/g, '\\$&')
    const pattern = `%${term}%`

    // Buscar productos no-bundle cuyo nombre haga match
    const { data: prodIds } = await supabase
      .from('productos')
      .select('id')
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .eq('es_bundle', false)
      .ilike('nombre', pattern)
      .limit(30)

    if (!prodIds || prodIds.length === 0) return { ok: true, data: [] }

    const ids = (prodIds as Array<{ id: string }>).map((p) => p.id)

    const { data: variantesRaw, error } = await supabase
      .from('variantes_producto')
      .select(
        'id, codigo_barras, stock_actual, precio_venta, ' +
          'producto:productos!inner(nombre, precio_compra), ' +
          'talla:tallas(nombre), color:colores(nombre)'
      )
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .in('producto_id', ids)
      .limit(20)

    if (error) return { ok: false, error: error.message }

    const items: ComponenteBundleItem[] = ((variantesRaw ?? []) as unknown as Array<Record<string, unknown>>)
      .filter((r) => r.id !== excludeVarianteId)
      .map((r) => {
        const prod = (Array.isArray(r.producto) ? r.producto[0] : r.producto) as Record<string, unknown> | null
        const talla = (Array.isArray(r.talla) ? r.talla[0] : r.talla) as Record<string, unknown> | null
        const color = (Array.isArray(r.color) ? r.color[0] : r.color) as Record<string, unknown> | null
        return {
          id: '',
          componente_variante_id: r.id as string,
          cantidad: 1,
          nombre: (prod?.nombre as string) ?? 'Producto',
          talla: (talla?.nombre as string | null) ?? null,
          color: (color?.nombre as string | null) ?? null,
          codigo_barras: (r.codigo_barras as string | null) ?? null,
          stock_actual: Number(r.stock_actual ?? 0),
          precio_compra: Number(prod?.precio_compra ?? 0),
        }
      })

    return { ok: true, data: items }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/**
 * Guarda los componentes bundle para TODAS las variantes de un producto en una sola operación.
 * Reemplaza la llamada individual por variante cuando el producto tiene múltiples variantes bundle.
 */
export async function guardarTodosComponentesBundle(
  productoId: string,
  esBundle: boolean,
  items: Array<{ varianteBundleId: string; componentes: ComponenteBundleInput[] }>
): Promise<ActionResult> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()

    // Verificar que el producto pertenece a la tienda
    const { data: prodCheck } = await supabase
      .from('productos')
      .select('id')
      .eq('id', productoId)
      .eq('tienda_id', tiendaId)
      .maybeSingle()

    if (!prodCheck) return { ok: false, error: 'Producto no encontrado' }

    for (const item of items) {
      const { varianteBundleId, componentes } = item

      // Verificar que la variante pertenece al producto
      const { data: varianteCheck } = await supabase
        .from('variantes_producto')
        .select('id, producto_id')
        .eq('id', varianteBundleId)
        .eq('tienda_id', tiendaId)
        .maybeSingle()

      if (!varianteCheck || varianteCheck.producto_id !== productoId) continue

      // Validar auto-referencia
      if (componentes.some((c) => c.componente_variante_id === varianteBundleId)) {
        return { ok: false, error: 'Un bundle no puede referenciarse a sí mismo' }
      }

      // Validar cantidades
      if (componentes.some((c) => !Number.isFinite(c.cantidad) || c.cantidad <= 0)) {
        return { ok: false, error: 'La cantidad de cada componente debe ser mayor a 0' }
      }

      // Eliminar componentes anteriores de esta variante
      await supabase
        .from('producto_componentes')
        .delete()
        .eq('variante_bundle_id', varianteBundleId)
        .eq('tienda_id', tiendaId)

      if (componentes.length > 0) {
        const rows = componentes.map((c) => ({
          tienda_id: tiendaId,
          variante_bundle_id: varianteBundleId,
          componente_variante_id: c.componente_variante_id,
          cantidad: c.cantidad,
        }))
        const { error } = await supabase.from('producto_componentes').insert(rows)
        if (error) return { ok: false, error: error.message }
      }
    }

    // Marcar el producto como bundle solo si el toggle está activo y alguna variante tiene componentes
    const anyHasComponents = items.some((i) => i.componentes.length > 0)
    await supabase
      .from('productos')
      .update({ es_bundle: esBundle && anyHasComponents })
      .eq('id', productoId)
      .eq('tienda_id', tiendaId)

    revalidatePath(`/productos/${productoId}`)
    revalidatePath('/productos')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
