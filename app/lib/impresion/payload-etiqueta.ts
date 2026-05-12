import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConfiguracionEtiqueta } from '@/types/database'
import type {
  PayloadEtiquetaItem,
  PayloadEtiquetaProducto,
} from './types'
import { plantillaSnapshot } from './types'

export interface ItemSeleccionado {
  variante_id: string
  cantidad: number
}

/**
 * Construye el snapshot completo del payload de etiquetas.
 * Hace queries a variantes_producto + productos para resolver datos.
 */
export async function buildPayloadEtiquetas(
  supabase: SupabaseClient,
  tiendaId: string,
  items: ItemSeleccionado[],
  plantilla: ConfiguracionEtiqueta,
  simboloMoneda: string = '$'
): Promise<PayloadEtiquetaProducto> {
  const ids = items.map((i) => i.variante_id)

  const { data, error } = await supabase
    .from('variantes_producto')
    .select(
      'id, codigo_barras, precio_venta, ' +
        'producto:productos!inner(id, nombre, precio_venta), ' +
        'talla:tallas(nombre), color:colores(nombre)'
    )
    .eq('tienda_id', tiendaId)
    .in('id', ids)

  if (error) throw new Error(error.message)

  const rows = ((data ?? []) as unknown) as Array<Record<string, unknown>>
  const map = new Map<string, PayloadEtiquetaItem>()

  for (const r of rows) {
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
    const precioProd = producto?.precio_venta != null ? Number(producto.precio_venta as number) : 0
    const precio = precioVar != null && precioVar > 0 ? precioVar : precioProd

    map.set(r.id as string, {
      variante_id: r.id as string,
      nombre_producto: (producto?.nombre as string) ?? 'Producto',
      talla: (talla?.nombre as string | null) ?? null,
      color: (color?.nombre as string | null) ?? null,
      codigo_barras: (r.codigo_barras as string | null) ?? null,
      precio,
      cantidad: 0,
    })
  }

  const itemsPayload: PayloadEtiquetaItem[] = []
  for (const it of items) {
    const base = map.get(it.variante_id)
    if (!base) continue
    if (it.cantidad <= 0) continue
    itemsPayload.push({ ...base, cantidad: Math.floor(it.cantidad) })
  }

  return {
    plantilla: plantillaSnapshot(plantilla),
    items: itemsPayload,
    simbolo_moneda: simboloMoneda,
  }
}
