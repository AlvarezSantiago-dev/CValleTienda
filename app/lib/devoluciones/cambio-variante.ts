export type SubtipoCambioLinea = 'misma_variante' | 'otra_variante'

export type MotivoBloqueoCambio =
  | 'otro_precio'
  | 'sin_stock'
  | 'inactiva'
  | 'misma_variante'
  | null

export interface CambioLineaState {
  subtipo: SubtipoCambioLinea
  variante_entrega_id?: string
}

const PRECIO_TOLERANCIA = 0.01

export function preciosCoinciden(a: number, b: number): boolean {
  return Math.abs(a - b) < PRECIO_TOLERANCIA
}

export function labelMotivoBloqueo(motivo: MotivoBloqueoCambio): string {
  switch (motivo) {
    case 'otro_precio':
      return 'Otro precio — cobrá la diferencia en el POS'
    case 'sin_stock':
      return 'Sin stock'
    case 'inactiva':
      return 'Inactiva'
    case 'misma_variante':
      return 'Variante devuelta'
    default:
      return ''
  }
}

export function calcularSubtipoCambioCabecera(
  subtips: SubtipoCambioLinea[]
): 'misma_variante' | 'otra_variante' | 'mixto' | null {
  if (subtips.length === 0) return null
  const uniq = new Set(subtips)
  if (uniq.size > 1) return 'mixto'
  return subtips[0]
}
