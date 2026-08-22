import { MAX_QTY_LINEA } from './const'
import type { CartItem } from './types'
import { claveLineaCarrito } from './carrito'
import { esStockInfinito } from '@/lib/stock/infinito'
import { maxPresentaciones, unidadesFisicas } from '@/lib/stock/consumo'

function stockFisicoItem(it: CartItem): number | null {
  if (it.stockActual == null) return null
  return it.stockActual
}

export function consumoFisicoVariante(
  cart: CartItem[],
  varianteId: string,
  exceptClave?: string
): number {
  return cart.reduce((acc, x) => {
    if (x.varianteId !== varianteId) return acc
    if (exceptClave && claveLineaCarrito(x) === exceptClave) return acc
    return acc + unidadesFisicas(x.qty, x.packUnidades)
  }, 0)
}

export type TonoStockCatalogo = 'ok' | 'aviso' | 'agotado'

/** Copy de stock para la ficha. Null si el stock es ilimitado. */
export function textoStockCatalogo(input: {
  stockFisico: number
  enPedidoFisico: number
  packUnidades?: number | null
  packLabel?: string | null
}): { texto: string; tono: TonoStockCatalogo } | null {
  if (esStockInfinito(input.stockFisico)) return null
  const stock = Math.max(0, Number(input.stockFisico) || 0)
  const enPedido = Math.max(0, Number(input.enPedidoFisico) || 0)
  const disponible = Math.max(0, stock - enPedido)
  const pack = Number(input.packUnidades)
  const size = Number.isFinite(pack) && pack > 1 ? pack : 1
  const label = input.packLabel?.trim() || (size > 1 ? `Pack x${size}` : null)

  if (size > 1) {
    const packs = Math.floor(disponible / size)
    if (packs > 0) {
      const packsTxt = packs === 1 ? '1 pack' : `${packs} packs`
      return { texto: `${packsTxt} disponibles · ${disponible} u.`, tono: 'ok' }
    }
    if (disponible > 0) {
      return {
        texto: `Quedan ${disponible} u. · ${label ?? 'este pack'} lleva ${size}`,
        tono: 'aviso',
      }
    }
    if (enPedido > 0) {
      return {
        texto: `Sin más stock para ${label ?? 'este pack'} · ${enPedido} u. en el pedido`,
        tono: 'agotado',
      }
    }
    return { texto: `Sin stock para ${label ?? 'este pack'}`, tono: 'agotado' }
  }

  if (disponible > 0) {
    return {
      texto:
        enPedido > 0
          ? `${disponible} disponibles · ${enPedido} en el pedido`
          : `${disponible} disponibles`,
      tono: 'ok',
    }
  }
  if (enPedido > 0) {
    return { texto: `Sin más stock · ${enPedido} en el pedido`, tono: 'agotado' }
  }
  return { texto: 'Sin stock disponible', tono: 'agotado' }
}

/** Badge de la grilla: número solo si hay una variante; “Sin stock” si todas están en 0. */
export function textoStockGrilla(
  variantes: Array<{ stock_actual: number }>
): { texto: string; tono: 'ok' | 'agotado' } | null {
  if (variantes.length === 0) return { texto: 'Sin stock', tono: 'agotado' }
  if (variantes.some((v) => esStockInfinito(v.stock_actual))) return null
  const stocks = variantes.map((v) => Math.max(0, Number(v.stock_actual) || 0))
  if (stocks.every((s) => s <= 0)) return { texto: 'Sin stock', tono: 'agotado' }
  if (variantes.length === 1) return { texto: `${stocks[0]} u.`, tono: 'ok' }
  return null
}

/** Máximo de qty para una línea del carrito público, según snapshot de stock. */
export function maxQtyCatalogoLinea(items: CartItem[], it: CartItem): number {
  const stock = stockFisicoItem(it)
  if (stock == null) return MAX_QTY_LINEA
  const ilimitado = esStockInfinito(stock)
  const restoFisico = ilimitado
    ? stock
    : stock - consumoFisicoVariante(items, it.varianteId, claveLineaCarrito(it))
  return maxPresentaciones(restoFisico, it.packUnidades, ilimitado, MAX_QTY_LINEA)
}

export function maxQtyCatalogoNueva(
  cart: CartItem[],
  varianteId: string,
  stockActual: number,
  packUnidades: number | null,
  exceptClave?: string
): number {
  const ilimitado = esStockInfinito(stockActual)
  const restoFisico = ilimitado
    ? stockActual
    : stockActual - consumoFisicoVariante(cart, varianteId, exceptClave)
  return maxPresentaciones(restoFisico, packUnidades, ilimitado, MAX_QTY_LINEA)
}
