import type { VarianteInput } from '@/app/actions/productos'
import type { CargaExpressCelda } from './tipos'

export type CeldaConIds = {
  colorId: string
  tallaId: string
  cantidad: number
}

/**
 * Convierte celdas resueltas (con ids) en VarianteInput[].
 * Por default solo incluye cantidad > 0 (matriz sparsa).
 */
export function expandirVariantes(
  celdas: CeldaConIds[],
  opts?: { crearCeldasEnCero?: boolean; codigosBarras?: (string | null)[] }
): VarianteInput[] {
  const crearCero = opts?.crearCeldasEnCero ?? false
  const filtradas = celdas.filter((c) => (crearCero ? c.cantidad >= 0 : c.cantidad > 0))

  // Deduplicar por color+talla (última cantidad gana)
  const map = new Map<string, CeldaConIds>()
  for (const c of filtradas) {
    map.set(`${c.colorId}|${c.tallaId}`, c)
  }

  const lista = Array.from(map.values())
  return lista.map((c, i) => ({
    talla_id: c.tallaId,
    color_id: c.colorId,
    codigo_barras: opts?.codigosBarras?.[i] ?? null,
    precio_venta: null,
    stock_inicial: Math.round(c.cantidad),
    stock_minimo: 0,
  }))
}

/** Filtra celdas del draft por política sparsa (nombres). */
export function filtrarCeldasDraft(
  celdas: CargaExpressCelda[],
  crearCeldasEnCero = false
): CargaExpressCelda[] {
  return celdas.filter((c) => {
    if (!c.colorNombre?.trim() || !c.tallaNombre?.trim()) return false
    return crearCeldasEnCero ? c.cantidad >= 0 : c.cantidad > 0
  })
}

export function totalUnidades(celdas: CargaExpressCelda[], crearCeldasEnCero = false): number {
  return filtrarCeldasDraft(celdas, crearCeldasEnCero).reduce(
    (acc, c) => acc + Math.max(0, Math.round(c.cantidad)),
    0
  )
}
