export interface TramoCantidad {
  cantidad_desde: number
  descuento_pct: number
}

export const MAX_TRAMOS = 12

function round2(n: number) {
  return Math.round(n * 100) / 100
}

/** Pct del mejor tramo (mayor cantidad_desde ≤ qty). 0 si no hay. */
export function descuentoPctTramo(tramos: TramoCantidad[], qty: number): number {
  if (!Number.isFinite(qty) || qty <= 0 || !Array.isArray(tramos) || tramos.length === 0) {
    return 0
  }
  let bestPct = 0
  let bestDesde = 0
  for (const t of tramos) {
    const desde = Number(t.cantidad_desde)
    const pct = Number(t.descuento_pct)
    if (!Number.isFinite(desde) || desde <= 0) continue
    if (!Number.isFinite(pct) || pct < 0) continue
    if (desde <= qty && desde >= bestDesde) {
      bestDesde = desde
      bestPct = Math.min(100, pct)
    }
  }
  return bestPct
}

export function precioConTramo(
  precioLista: number,
  tramos: TramoCantidad[],
  qty: number
): number {
  const lista = Number(precioLista)
  if (!Number.isFinite(lista) || lista <= 0) return 0
  const pct = descuentoPctTramo(tramos, qty)
  return round2(lista * (1 - pct / 100))
}

export function textoTramos(tramos: TramoCantidad[], unidad = 'u.'): string {
  return [...tramos]
    .filter((t) => Number(t.cantidad_desde) > 0)
    .sort((a, b) => Number(a.cantidad_desde) - Number(b.cantidad_desde))
    .map((t) => `Desde ${Number(t.cantidad_desde)} ${unidad} ${Number(t.descuento_pct)} %`)
    .join(' · ')
}

export type ItemGrupoTramo = {
  productoId?: string | null
  packId?: string | null
  cantidad: number
  /** Pack overlay / auto-pack. No mezclar con sueltas si no hay packId. */
  esPack?: boolean
}

/** Misma presentación del mismo producto (unidad o un pack concreto). */
export function claveGrupoTramo(
  productoId: string,
  packId?: string | null,
  esPack = false
): string {
  if (packId) return `${productoId}::${packId}`
  return `${productoId}::${esPack ? '_pack' : ''}`
}

export function qtyGrupoTramo(
  items: ItemGrupoTramo[],
  productoId: string | null | undefined,
  packId?: string | null,
  esPack = false
): number {
  if (!productoId) return 0
  const clave = claveGrupoTramo(productoId, packId, esPack)
  return items.reduce((acc, it) => {
    if (!it.productoId) return acc
    if (claveGrupoTramo(it.productoId, it.packId, it.esPack) !== clave) return acc
    const n = Number(it.cantidad)
    return acc + (Number.isFinite(n) && n > 0 ? n : 0)
  }, 0)
}

/**
 * Qty para el tramo: suma variantes del mismo producto y misma presentación.
 * Sin productoId, usa solo la línea (compat).
 */
export function qtyParaTramo(items: ItemGrupoTramo[], item: ItemGrupoTramo): number {
  if (!item.productoId) return Number(item.cantidad) || 0
  return qtyGrupoTramo(items, item.productoId, item.packId, item.esPack)
}

export function validarTramos(
  tramos: TramoCantidad[]
): { ok: true; tramos: TramoCantidad[] } | { ok: false; error: string } {
  if (!Array.isArray(tramos) || tramos.length === 0) {
    return { ok: true, tramos: [] }
  }
  if (tramos.length > MAX_TRAMOS) {
    return { ok: false, error: `Máximo ${MAX_TRAMOS} tramos` }
  }
  const seen = new Set<string>()
  const out: TramoCantidad[] = []
  for (const t of tramos) {
    const desde = Number(t.cantidad_desde)
    const pct = Number(t.descuento_pct)
    if (!Number.isFinite(desde) || desde <= 0) {
      return { ok: false, error: 'Cada tramo necesita una cantidad mayor a 0' }
    }
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      return { ok: false, error: 'El descuento debe estar entre 0 y 100 %' }
    }
    const key = String(Math.round(desde * 1000) / 1000)
    if (seen.has(key)) {
      return { ok: false, error: 'No puede haber dos tramos con la misma cantidad' }
    }
    seen.add(key)
    out.push({ cantidad_desde: Math.round(desde * 1000) / 1000, descuento_pct: round2(pct) })
  }
  out.sort((a, b) => a.cantidad_desde - b.cantidad_desde)
  return { ok: true, tramos: out }
}
