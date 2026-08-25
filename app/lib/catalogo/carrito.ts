import { CART_STORAGE_PREFIX } from './const'
import type { CartItem } from './types'
import { precioConTramo, qtyParaTramo } from '@/lib/precios/tramos-cantidad'
import { precioConRecargoCc, recargoEfectivo } from '@/lib/pos/precio-cc'

export function cartKey(slug: string): string {
  return `${CART_STORAGE_PREFIX}${slug}`
}

export function leerCarrito(slug: string): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(cartKey(slug))
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(esCartItem)
  } catch {
    return []
  }
}

export function guardarCarrito(slug: string, items: CartItem[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(cartKey(slug), JSON.stringify(items))
}

export function vaciarCarrito(slug: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(cartKey(slug))
}

function esCartItem(x: unknown): x is CartItem {
  if (!x || typeof x !== 'object') return false
  const o = x as CartItem
  return typeof o.varianteId === 'string' && typeof o.qty === 'number' && o.qty > 0
}

export function qtyCarrito(items: CartItem[]): number {
  return items.reduce((acc, it) => acc + it.qty, 0)
}

export function totalCarrito(items: CartItem[]): number {
  return items.reduce((acc, it) => acc + it.qty * it.precio, 0)
}

export function totalCarritoCc(items: CartItem[], recargoDefault: number): number {
  return items.reduce((acc, it) => {
    const recargo = recargoEfectivo(it.recargo_cc_pct, recargoDefault)
    return acc + it.qty * precioConRecargoCc(it.precio, recargo)
  }, 0)
}

export function claveLineaCarrito(it: { varianteId: string; packId?: string | null }): string {
  return it.packId ? `${it.varianteId}::${it.packId}` : it.varianteId
}

export function recostearCarrito(items: CartItem[]): CartItem[] {
  const grupos = items.map((x) => ({
    productoId: x.productoId,
    packId: x.packId,
    cantidad: x.qty,
  }))
  return items.map((item) => {
    const lista = item.precioLista ?? item.precio
    const tramos = item.tramos ?? []
    const qty = qtyParaTramo(grupos, {
      productoId: item.productoId,
      packId: item.packId,
      cantidad: item.qty,
    })
    return {
      ...item,
      precioLista: lista,
      precio: precioConTramo(lista, tramos, qty),
    }
  })
}

export function recostearItemCarrito(item: CartItem): CartItem {
  return recostearCarrito([item])[0]
}

/** Qty del tramo en ficha: stepper a agregar + lo que ya hay del mismo producto/pack en el carrito. */
export function qtyGrupoFicha(
  cart: CartItem[],
  productoId: string,
  packId: string | null,
  qtyStepper: number
): number {
  let total = qtyStepper
  for (const it of cart) {
    if (it.productoId !== productoId) continue
    if ((it.packId ?? null) !== packId) continue
    total += it.qty
  }
  return total
}
