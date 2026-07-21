import { createClient } from '@/lib/supabase/server'
import {
  type MotivoBloqueoCambio,
  preciosCoinciden,
} from '@/lib/devoluciones/cambio-variante'
import { tieneStockSuficiente } from '@/lib/stock/infinito'

export interface VarianteCambioOpcion {
  variante_id: string
  talla: string | null
  color: string | null
  codigo_barras: string | null
  precio_venta: number
  stock_actual: number
  activo: boolean
  seleccionable: boolean
  motivo_bloqueo: MotivoBloqueoCambio
}

const VARIANTE_SELECT =
  'id, codigo_barras, precio_venta, stock_actual, activo, ' +
  'producto:productos(precio_venta), ' +
  'talla:tallas(nombre), color:colores(nombre)'

/** Misma regla que POS: variante sin precio propio hereda precio_venta del producto. */
function resolverPrecioVentaEfectivo(
  precioVariante: unknown,
  producto: Record<string, unknown> | null
): number {
  const precioVar =
    precioVariante != null && precioVariante !== '' ? Number(precioVariante) : null
  const precioProd =
    producto?.precio_venta != null ? Number(producto.precio_venta) : 0
  return precioVar != null && precioVar > 0 ? precioVar : precioProd
}

function unwrap(v: unknown): Record<string, unknown> | null {
  if (!v) return null
  if (Array.isArray(v)) return (v[0] as Record<string, unknown>) ?? null
  return v as Record<string, unknown>
}

function mapVarianteRow(
  r: Record<string, unknown>,
  precioReferencia: number,
  cantidadNecesaria: number,
  varianteOrigenId: string | null
): VarianteCambioOpcion {
  const talla = unwrap(r.talla)
  const color = unwrap(r.color)
  const producto = unwrap(r.producto)
  const id = r.id as string
  const precio = resolverPrecioVentaEfectivo(r.precio_venta, producto)
  const stock = Number(r.stock_actual)
  const activo = r.activo !== false

  let motivo_bloqueo: MotivoBloqueoCambio = null
  if (varianteOrigenId && id === varianteOrigenId) {
    motivo_bloqueo = 'misma_variante'
  } else if (!activo) {
    motivo_bloqueo = 'inactiva'
  } else if (!preciosCoinciden(precio, precioReferencia)) {
    motivo_bloqueo = 'otro_precio'
  } else if (!tieneStockSuficiente(stock, cantidadNecesaria)) {
    motivo_bloqueo = 'sin_stock'
  }

  return {
    variante_id: id,
    talla: (talla?.nombre as string | null) ?? null,
    color: (color?.nombre as string | null) ?? null,
    codigo_barras: (r.codigo_barras as string | null) ?? null,
    precio_venta: precio,
    stock_actual: stock,
    activo,
    seleccionable: motivo_bloqueo === null,
    motivo_bloqueo,
  }
}

function sortOpciones(a: VarianteCambioOpcion, b: VarianteCambioOpcion): number {
  if (a.seleccionable !== b.seleccionable) return a.seleccionable ? -1 : 1
  const ta = a.talla ?? ''
  const tb = b.talla ?? ''
  if (ta !== tb) return ta.localeCompare(tb, 'es')
  return (a.color ?? '').localeCompare(b.color ?? '', 'es')
}

export async function obtenerVariantesParaCambio(
  productoId: string,
  precioReferencia: number,
  varianteOrigenId: string | null,
  cantidadNecesaria: number
): Promise<VarianteCambioOpcion[]> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return []

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!perfil) return []

  const { data, error } = await supabase
    .from('variantes_producto')
    .select(VARIANTE_SELECT)
    .eq('tienda_id', perfil.tienda_id)
    .eq('producto_id', productoId)
    .order('created_at', { ascending: true })

  if (error || !data) return []

  return ((data ?? []) as unknown as Array<Record<string, unknown>>)
    .map((r) => mapVarianteRow(r, precioReferencia, cantidadNecesaria, varianteOrigenId))
    .sort(sortOpciones)
}

export interface VarianteEntregaSnapshot {
  variante_entrega_id: string
  nombre_producto_entrega: string
  talla_entrega: string | null
  color_entrega: string | null
  codigo_barras_entrega: string | null
  producto_id: string
  precio_venta: number
  stock_actual: number
  activo: boolean
}

export async function obtenerVarianteEntregaParaValidacion(
  varianteEntregaId: string,
  tiendaId: string
): Promise<VarianteEntregaSnapshot | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('variantes_producto')
    .select(
      'id, producto_id, codigo_barras, precio_venta, stock_actual, activo, ' +
        'producto:productos(nombre, precio_venta), talla:tallas(nombre), color:colores(nombre)'
    )
    .eq('tienda_id', tiendaId)
    .eq('id', varianteEntregaId)
    .maybeSingle()

  if (error || !data) return null

  const r = data as unknown as Record<string, unknown>
  const producto = unwrap(r.producto)
  const talla = unwrap(r.talla)
  const color = unwrap(r.color)

  return {
    variante_entrega_id: r.id as string,
    nombre_producto_entrega: (producto?.nombre as string) ?? 'Producto',
    talla_entrega: (talla?.nombre as string | null) ?? null,
    color_entrega: (color?.nombre as string | null) ?? null,
    codigo_barras_entrega: (r.codigo_barras as string | null) ?? null,
    producto_id: r.producto_id as string,
    precio_venta: resolverPrecioVentaEfectivo(r.precio_venta, producto),
    stock_actual: Number(r.stock_actual),
    activo: r.activo !== false,
  }
}
