import type { CondicionPago } from '@/types/database'
import { aplicarPrecioPack, type ItemConPack } from '@/lib/pos/aplicarPrecioPack'
import { precioConRecargoCc, recargoEfectivo } from '@/lib/pos/precio-cc'
import { precioConTramo, qtyParaTramo, type TramoCantidad } from '@/lib/precios/tramos-cantidad'

export interface ItemPrecioCc {
  precio_unitario: number
  precio_contado?: number
  recargo_cc_pct?: number | null
  es_pack?: boolean
  precio_unidad_original?: number
  precio_lista?: number
  tramos?: TramoCantidad[]
  cantidad?: number
}

/** Recalcula precio_unitario desde precio_contado según la condición. */
export function aplicarPreciosCondicion<T extends ItemPrecioCc>(
  items: T[],
  condicion: CondicionPago,
  recargoDefault: number
): T[] {
  return items.map((it) => {
    const contado = it.precio_contado ?? it.precio_unitario
    const recargo = recargoEfectivo(it.recargo_cc_pct, recargoDefault)
    return {
      ...it,
      precio_contado: contado,
      precio_unitario:
        condicion === 'cuenta_corriente'
          ? precioConRecargoCc(contado, recargo)
          : contado,
    }
  })
}

function aplicarTramoLinea<T extends ItemPrecioCc & ItemConPack>(it: T, items: T[]): T {
  const lista = it.precio_lista ?? (it.es_pack ? it.precio_unitario : it.precio_unidad_original) ?? it.precio_unitario
  const qty = qtyParaTramo(
    items.map((x) => ({
      productoId: x.producto_id,
      packId: x.pack_id,
      cantidad: x.cantidad,
      esPack: x.es_pack,
    })),
    {
      productoId: it.producto_id,
      packId: it.pack_id,
      cantidad: it.cantidad,
      esPack: it.es_pack,
    }
  )
  const contado = precioConTramo(lista, it.tramos ?? [], qty)
  return { ...it, precio_lista: lista, precio_unitario: contado, precio_contado: contado }
}

/**
 * Pack siempre sobre precios de lista; tramo sobre qty del producto (todas las variantes);
 * después recargo CC.
 */
export function syncCarritoPrecios<T extends ItemConPack & ItemPrecioCc>(
  items: T[],
  opts: {
    usarPack: boolean
    permiteInfinito: boolean
    condicion: CondicionPago
    recargoDefault: number
  }
): T[] {
  const cash = items.map((it) => {
    const lista = it.precio_lista ?? it.precio_unidad_original ?? it.precio_contado ?? it.precio_unitario
    return {
      ...it,
      precio_lista: lista,
      precio_unitario: lista,
      precio_unidad_original: it.es_pack
        ? it.precio_unidad_original
        : (it.precio_unidad_original && it.precio_unidad_original > 0
            ? it.precio_unidad_original
            : lista),
    } as T
  })
  const packed = opts.usarPack ? aplicarPrecioPack(cash, opts.permiteInfinito) : cash
  const withTramo = packed.map((it) => aplicarTramoLinea(it, packed))
  return aplicarPreciosCondicion(withTramo, opts.condicion, opts.recargoDefault)
}
