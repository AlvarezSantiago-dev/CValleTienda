import { CART_STORAGE_PREFIX } from './const'
import type { CartItem } from './types'
import { precioConTramo } from '@/lib/precios/tramos-cantidad'
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

export function recostearItemCarrito(item: CartItem): CartItem {
  const lista = item.precioLista ?? item.precio
  const tramos = item.tramos ?? []
  return {
    ...item,
    precioLista: lista,
    precio: precioConTramo(lista, tramos, item.qty),
  }
}
