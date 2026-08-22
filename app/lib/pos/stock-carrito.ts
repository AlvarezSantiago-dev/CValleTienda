import { esStockInfinito, STOCK_INFINITO, tieneStockSuficiente } from '@/lib/stock/infinito'
import { maxPresentaciones, unidadesFisicas } from '@/lib/stock/consumo'

const UNIDADES_ENTERAS = new Set(['unidad', 'pack', 'caja', 'bolsa'])

export interface LineaStockPos {
  id: string
  variante_id: string
  cantidad: number
  stock_actual: number
  stock_fisico?: number
  es_pack?: boolean
  pack_cantidad?: number | null
  unidad_de_medida?: string
}

export function esCantidadEnteraPos(unidad?: string): boolean {
  if (!unidad) return true
  return UNIDADES_ENTERAS.has(unidad)
}

export function stockFisicoDeItem(item: LineaStockPos): number {
  if (item.stock_fisico != null) return item.stock_fisico
  if (esStockInfinito(item.stock_actual)) return STOCK_INFINITO
  if (item.es_pack && item.pack_cantidad && item.pack_cantidad > 1) {
    return item.stock_actual * item.pack_cantidad
  }
  return item.stock_actual
}

export function packUnidadesLinea(item: Pick<LineaStockPos, 'es_pack' | 'pack_cantidad'>): number {
  return item.es_pack && item.pack_cantidad && item.pack_cantidad > 1 ? item.pack_cantidad : 1
}

export function stockFisicoValido(items: LineaStockPos[], permiteInfinito: boolean): boolean {
  const consumo = new Map<string, { cantidad: number; disponible: number }>()
  for (const item of items) {
    const cantidadFisica = unidadesFisicas(item.cantidad, packUnidadesLinea(item))
    const disponible = stockFisicoDeItem(item)
    const actual = consumo.get(item.variante_id)
    consumo.set(item.variante_id, {
      cantidad: (actual?.cantidad ?? 0) + cantidadFisica,
      disponible,
    })
  }
  return Array.from(consumo.values()).every((item) =>
    tieneStockSuficiente(item.disponible, item.cantidad, permiteInfinito)
  )
}

/** Máximo de presentaciones que se puede poner en esta línea sin pasarse del stock físico. */
export function maxCantidadPos(
  items: LineaStockPos[],
  itemId: string,
  permiteInfinito: boolean
): number {
  const item = items.find((i) => i.id === itemId)
  if (!item) return 0
  const fisico = stockFisicoDeItem(item)
  const otros = items
    .filter((i) => i.variante_id === item.variante_id && i.id !== itemId)
    .reduce((acc, i) => acc + unidadesFisicas(i.cantidad, packUnidadesLinea(i)), 0)
  const restante =
    esStockInfinito(fisico) && permiteInfinito ? STOCK_INFINITO : fisico - otros
  return maxPresentaciones(
    restante,
    packUnidadesLinea(item),
    permiteInfinito,
    undefined,
    esCantidadEnteraPos(item.unidad_de_medida)
  )
}

export function puedeAgregarPos(
  items: LineaStockPos[],
  input: {
    varianteId: string
    cantidad: number
    packUnidades?: number | null
    stockFisico: number
    lineId?: string
  },
  permiteInfinito: boolean
): boolean {
  const extra = unidadesFisicas(input.cantidad, input.packUnidades)
  const consumo = items
    .filter((i) => i.variante_id === input.varianteId && i.id !== input.lineId)
    .reduce((acc, i) => acc + unidadesFisicas(i.cantidad, packUnidadesLinea(i)), 0)
  return tieneStockSuficiente(input.stockFisico, consumo + extra, permiteInfinito)
}
