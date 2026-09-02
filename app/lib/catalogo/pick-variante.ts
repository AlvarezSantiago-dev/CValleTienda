import type { VarianteCatalogoPublica } from './types'

type Eje = 'talla' | 'color'

/** Match exacto; si no existe, la primera variante del eje que se clickeó. */
export function resolverVariante<T extends Pick<VarianteCatalogoPublica, 'id' | 'talla' | 'color'>>(
  variantes: T[],
  talla: string | null,
  color: string | null,
  eje: Eje
): T | undefined {
  if (variantes.length === 0) return undefined
  const exact = variantes.find((v) => (v.talla ?? null) === talla && (v.color ?? null) === color)
  if (exact) return exact
  if (eje === 'talla') {
    return variantes.find((v) => (v.talla ?? null) === talla) ?? variantes[0]
  }
  return variantes.find((v) => (v.color ?? null) === color) ?? variantes[0]
}

export function valoresEje1<T extends Pick<VarianteCatalogoPublica, 'talla'>>(variantes: T[]): string[] {
  return [...new Set(variantes.map((v) => v.talla).filter((x): x is string => Boolean(x)))]
}

/** Presentaciones (eje 2) que existen para la marca/eje 1 seleccionado. */
export function valoresEje2ParaEje1<T extends Pick<VarianteCatalogoPublica, 'talla' | 'color'>>(
  variantes: T[],
  talla: string | null
): string[] {
  const pool = talla ? variantes.filter((v) => (v.talla ?? null) === talla) : variantes
  const fromPool = [...new Set(pool.map((v) => v.color).filter((x): x is string => Boolean(x)))]
  if (fromPool.length > 0) return fromPool
  return [...new Set(variantes.map((v) => v.color).filter((x): x is string => Boolean(x)))]
}
