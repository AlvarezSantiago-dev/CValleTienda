'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { plantillaSnapshot } from '@/lib/impresion/types'
import type {
  PayloadTicketVenta,
  PayloadTicketDevolucion,
  PayloadEtiquetaProducto,
  PayloadEtiquetaItem,
  FacturaTicketPayload,
} from '@/lib/impresion/types'
import type { ConfiguracionEtiqueta } from '@/types/database'

export interface ActionResult<T = unknown> {
  ok: boolean
  error?: string
  data?: T
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
  return { supabase, tiendaId: perfil.tienda_id as string, rol: perfil.rol as string }
}

function traducirError(msg: string | undefined | null): string {
  if (!msg) return 'Error desconocido'
  if (msg.includes('row-level security')) return 'No tenés permisos para esta operación'
  if (msg.includes('duplicate key')) return 'Ya existe un registro con esos datos'
  return msg
}

// =============================================================
// PAYLOADS — leen el snapshot listo desde el SQL builder
// =============================================================

export async function obtenerPayloadVenta(
  ventaId: string
): Promise<ActionResult<PayloadTicketVenta>> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()

    const { data: venta, error: vErr } = await supabase
      .from('ventas')
      .select('id, tienda_id, tipo_comprobante, numero_comprobante, cae, cae_vencimiento, qr_afip')
      .eq('id', ventaId)
      .maybeSingle()
    if (vErr) return { ok: false, error: traducirError(vErr.message) }
    if (!venta || venta.tienda_id !== tiendaId) {
      return { ok: false, error: 'Venta no encontrada' }
    }

    const { data, error } = await supabase.rpc('build_payload_ticket_venta', {
      p_venta_id: ventaId,
    })
    if (error) return { ok: false, error: traducirError(error.message) }

    const payload = data as PayloadTicketVenta

    // Adjuntar datos de factura si existen
    if (venta.cae && venta.tipo_comprobante && venta.numero_comprobante) {
      const venc = venta.cae_vencimiento as string | null
      let caeVencFormateado = ''
      if (venc) {
        // La DB guarda 'YYYY-MM-DD', lo convertimos a 'DD/MM/YYYY'
        const [yyyy, mm, dd] = venc.split('-')
        caeVencFormateado = `${dd}/${mm}/${yyyy}`
      }
      payload.factura = {
        tipo_comprobante: venta.tipo_comprobante as 'A' | 'B' | 'C',
        numero_comprobante: venta.numero_comprobante,
        cae: venta.cae,
        cae_vencimiento: caeVencFormateado,
        qr_afip: venta.qr_afip ?? '',
      } satisfies FacturaTicketPayload
    }

    return { ok: true, data: payload }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export async function obtenerPayloadDevolucion(
  devolucionId: string
): Promise<ActionResult<PayloadTicketDevolucion>> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()

    const { data: dev, error: dErr } = await supabase
      .from('devoluciones')
      .select('id, tienda_id')
      .eq('id', devolucionId)
      .maybeSingle()
    if (dErr) return { ok: false, error: traducirError(dErr.message) }
    if (!dev || dev.tienda_id !== tiendaId) {
      return { ok: false, error: 'Devolución no encontrada' }
    }

    const { data, error } = await supabase.rpc('build_payload_ticket_devolucion', {
      p_devolucion_id: devolucionId,
    })
    if (error) return { ok: false, error: traducirError(error.message) }
    return { ok: true, data: data as PayloadTicketDevolucion }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

// =============================================================
// ETIQUETAS DE VARIANTE
// =============================================================

export async function obtenerPayloadEtiquetasVariante(
  varianteId: string,
  cantidad: number
): Promise<ActionResult<PayloadEtiquetaProducto>> {
  try {
    const c = Math.floor(cantidad)
    if (!Number.isFinite(c) || c <= 0) {
      return { ok: false, error: 'La cantidad debe ser mayor a 0' }
    }
    if (c > 500) {
      return { ok: false, error: 'Máximo 500 etiquetas por lote' }
    }

    const { supabase, tiendaId } = await requireTiendaId()

    // Plantilla predeterminada
    const { data: plant, error: pErr } = await supabase
      .from('configuracion_etiquetas')
      .select('*')
      .eq('tienda_id', tiendaId)
      .eq('es_predeterminado', true)
      .maybeSingle()
    if (pErr) return { ok: false, error: traducirError(pErr.message) }
    if (!plant) {
      return {
        ok: false,
        error: 'No hay plantilla configurada. Andá a Configuración → Etiquetas.',
      }
    }
    const plantilla = plant as ConfiguracionEtiqueta

    // Datos de la variante
    const { data: row, error: vErr } = await supabase
      .from('variantes_producto')
      .select(
        'id, codigo_barras, precio_venta, ' +
          'producto:productos!inner(id, nombre, precio_venta), ' +
          'talla:tallas(nombre), color:colores(nombre)'
      )
      .eq('tienda_id', tiendaId)
      .eq('id', varianteId)
      .maybeSingle()
    if (vErr) return { ok: false, error: traducirError(vErr.message) }
    if (!row) return { ok: false, error: 'Variante no encontrada' }

    const r = row as unknown as Record<string, unknown>
    const producto = (Array.isArray(r.producto) ? r.producto[0] : r.producto) as
      | Record<string, unknown>
      | null
    const talla = (Array.isArray(r.talla) ? r.talla[0] : r.talla) as
      | Record<string, unknown>
      | null
    const color = (Array.isArray(r.color) ? r.color[0] : r.color) as
      | Record<string, unknown>
      | null

    const precioVar = r.precio_venta != null ? Number(r.precio_venta) : null
    const precioProd =
      producto?.precio_venta != null ? Number(producto.precio_venta as number) : 0
    const precio = precioVar != null && precioVar > 0 ? precioVar : precioProd

    const item: PayloadEtiquetaItem = {
      variante_id: r.id as string,
      nombre_producto: (producto?.nombre as string) ?? 'Producto',
      talla: (talla?.nombre as string | null) ?? null,
      color: (color?.nombre as string | null) ?? null,
      codigo_barras: (r.codigo_barras as string | null) ?? null,
      precio,
      cantidad: c,
    }

    const { data: cfgT } = await supabase
      .from('configuracion_tienda')
      .select('simbolo_moneda')
      .eq('tienda_id', tiendaId)
      .maybeSingle()
    const sym = (cfgT?.simbolo_moneda as string) ?? '$'

    const { data: tiendaRow } = await supabase
      .from('tiendas')
      .select('nombre')
      .eq('id', tiendaId)
      .maybeSingle()
    const nombreTienda = (tiendaRow?.nombre as string | null) ?? null

    const payload: PayloadEtiquetaProducto = {
      plantilla: plantillaSnapshot(plantilla),
      items: [item],
      simbolo_moneda: sym,
      nombre_tienda: nombreTienda,
    }

    return { ok: true, data: payload }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

// =============================================================
// ETIQUETAS DE PRODUCTO — todas las variantes de un producto
// =============================================================

export interface VarianteResumen {
  id: string
  nombre: string
  stock: number
}

export async function obtenerPayloadEtiquetasProducto(
  productoId: string
): Promise<ActionResult<{ payload: PayloadEtiquetaProducto; variantes: VarianteResumen[] }>> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()

    // Plantilla predeterminada
    const { data: plant, error: pErr } = await supabase
      .from('configuracion_etiquetas')
      .select('*')
      .eq('tienda_id', tiendaId)
      .eq('es_predeterminado', true)
      .maybeSingle()
    if (pErr) return { ok: false, error: traducirError(pErr.message) }
    if (!plant) {
      return {
        ok: false,
        error: 'No hay plantilla configurada. Andá a Configuración → Etiquetas.',
      }
    }
    const plantilla = plant as ConfiguracionEtiqueta

    // Variantes activas del producto con stock real
    const { data: rows, error: vErr } = await supabase
      .from('variantes_producto')
      .select(
        'id, codigo_barras, precio_venta, stock_actual, ' +
          'producto:productos!inner(id, nombre, precio_venta), ' +
          'talla:tallas(nombre), color:colores(nombre)'
      )
      .eq('tienda_id', tiendaId)
      .eq('producto_id', productoId)
      .eq('activo', true)
      .order('created_at')
    if (vErr) return { ok: false, error: traducirError(vErr.message) }
    if (!rows || rows.length === 0) {
      return { ok: false, error: 'Este producto no tiene variantes activas' }
    }

    const { data: cfgT } = await supabase
      .from('configuracion_tienda')
      .select('simbolo_moneda')
      .eq('tienda_id', tiendaId)
      .maybeSingle()
    const sym = (cfgT?.simbolo_moneda as string) ?? '$'

    const { data: tiendaRow } = await supabase
      .from('tiendas')
      .select('nombre')
      .eq('id', tiendaId)
      .maybeSingle()
    const nombreTienda = (tiendaRow?.nombre as string | null) ?? null

    const items: PayloadEtiquetaItem[] = []
    const variantesResumen: VarianteResumen[] = []

    for (const row of rows as unknown as Array<Record<string, unknown>>) {
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
      const precioProd = producto?.precio_venta != null ? Number(producto.precio_venta as number) : 0
      const precio = precioVar != null && precioVar > 0 ? precioVar : precioProd
      const stock = Math.max(0, Number(row.stock_actual ?? 0))

      // Nombre legible para el panel: "M · Negro" o nombre del producto si no hay vars
      const partes = [
        (talla?.nombre as string | null) ?? null,
        (color?.nombre as string | null) ?? null,
      ].filter(Boolean)
      const nombreVariante =
        partes.length > 0 ? partes.join(' · ') : ((producto?.nombre as string) ?? 'Variante')

      items.push({
        variante_id: row.id as string,
        nombre_producto: (producto?.nombre as string) ?? 'Producto',
        talla: (talla?.nombre as string | null) ?? null,
        color: (color?.nombre as string | null) ?? null,
        codigo_barras: (row.codigo_barras as string | null) ?? null,
        precio,
        cantidad: stock, // La UI puede sobreescribir esto
      })

      variantesResumen.push({
        id: row.id as string,
        nombre: nombreVariante,
        stock,
      })
    }

    const payload: PayloadEtiquetaProducto = {
      plantilla: plantillaSnapshot(plantilla),
      items,
      simbolo_moneda: sym,
      nombre_tienda: nombreTienda,
    }

    return { ok: true, data: { payload, variantes: variantesResumen } }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

// =============================================================
// PLANTILLA DE ETIQUETA — una sola, la predeterminada
// =============================================================

export interface PlantillaEtiquetaInput {
  nombre: string
  ancho_mm: number
  alto_mm: number
  mostrar_nombre: boolean
  mostrar_precio: boolean
  mostrar_talla: boolean
  mostrar_color: boolean
  mostrar_codigo: boolean
  mostrar_barcode: boolean
  mostrar_nombre_tienda: boolean
  tamano_fuente_nombre: number
  tamano_fuente_precio: number
  tamano_fuente_talla: number
}

function validarPlantilla(input: PlantillaEtiquetaInput): string | null {
  if (!input.nombre?.trim()) return 'El nombre es obligatorio'
  if (input.ancho_mm <= 0 || input.ancho_mm > 300) return 'Ancho fuera de rango (1–300 mm)'
  if (input.alto_mm <= 0 || input.alto_mm > 300) return 'Alto fuera de rango (1–300 mm)'
  if (input.tamano_fuente_nombre < 4 || input.tamano_fuente_nombre > 40)
    return 'Fuente del nombre fuera de rango (4–40)'
  if (input.tamano_fuente_precio < 4 || input.tamano_fuente_precio > 60)
    return 'Fuente del precio fuera de rango (4–60)'
  if (input.tamano_fuente_talla < 4 || input.tamano_fuente_talla > 40)
    return 'Fuente de talla fuera de rango (4–40)'
  return null
}

/**
 * Guarda la plantilla predeterminada de la tienda (única).
 * Crea si no existe, actualiza si existe.
 */
export async function guardarPlantillaEtiqueta(
  input: PlantillaEtiquetaInput
): Promise<ActionResult> {
  try {
    const err = validarPlantilla(input)
    if (err) return { ok: false, error: err }

    const { supabase, tiendaId } = await requireTiendaId()

    const { data: existente } = await supabase
      .from('configuracion_etiquetas')
      .select('id')
      .eq('tienda_id', tiendaId)
      .eq('es_predeterminado', true)
      .maybeSingle()

    const fila = {
      tienda_id: tiendaId,
      nombre: input.nombre.trim(),
      es_predeterminado: true,
      formato: `${input.ancho_mm}x${input.alto_mm}`,
      ancho_mm: input.ancho_mm,
      alto_mm: input.alto_mm,
      mostrar_nombre: input.mostrar_nombre,
      mostrar_precio: input.mostrar_precio,
      mostrar_talla: input.mostrar_talla,
      mostrar_color: input.mostrar_color,
      mostrar_codigo: input.mostrar_codigo,
      mostrar_barcode: input.mostrar_barcode,
      mostrar_logo: false,
      mostrar_nombre_tienda: input.mostrar_nombre_tienda,
      tamano_fuente_nombre: input.tamano_fuente_nombre,
      tamano_fuente_precio: input.tamano_fuente_precio,
      tamano_fuente_talla: input.tamano_fuente_talla,
      etiquetas_por_fila: 1,
      etiquetas_por_col: 1,
    }

    if (existente?.id) {
      const { error } = await supabase
        .from('configuracion_etiquetas')
        .update(fila)
        .eq('id', existente.id)
        .eq('tienda_id', tiendaId)
      if (error) return { ok: false, error: traducirError(error.message) }
    } else {
      const { error } = await supabase.from('configuracion_etiquetas').insert(fila)
      if (error) return { ok: false, error: traducirError(error.message) }
    }

    revalidatePath('/configuracion/etiquetas')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}
