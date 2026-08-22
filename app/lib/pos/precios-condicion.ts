import type { CondicionPago } from '@/types/database'
import { aplicarPrecioPack, type ItemConPack } from '@/lib/pos/aplicarPrecioPack'
import { precioConRecargoCc, recargoEfectivo } from '@/lib/pos/precio-cc'
import { precioConTramo, type TramoCantidad } from '@/lib/precios/tramos-cantidad'

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

function aplicarTramoLinea<T extends ItemPrecioCc & { cantidad: number }>(it: T): T {
  const lista = it.precio_lista ?? (it.es_pack ? it.precio_unitario : it.precio_unidad_original) ?? it.precio_unitario
  const contado = precioConTramo(lista, it.tramos ?? [], it.cantidad)
  return { ...it, precio_lista: lista, precio_unitario: contado, precio_contado: contado }
}

/**
 * Pack siempre sobre precios de lista; tramo sobre qty de la línea; después recargo CC.
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
  const withTramo = packed.map((it) => aplicarTramoLinea(it))
  return aplicarPreciosCondicion(withTramo, opts.condicion, opts.recargoDefault)
}
