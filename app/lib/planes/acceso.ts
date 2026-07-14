// =============================================================
// lib/planes/acceso.ts
// Acceso temporal (pago / trial) ≠ plan (features Básico/Pro).
// =============================================================

export type EstadoAcceso = 'activo' | 'por_vencer' | 'vencido' | 'trial'

const DIAS_POR_VENCER = 7

export function tieneAcceso(params: {
  acceso_hasta: string | null | undefined
  trial_hasta: string | null | undefined
  now?: Date
}): boolean {
  const now = params.now ?? new Date()
  if (params.trial_hasta && new Date(params.trial_hasta) > now) return true
  if (params.acceso_hasta && new Date(params.acceso_hasta) > now) return true
  return false
}

export function diasRestantesAcceso(
  acceso_hasta: string | null | undefined,
  now: Date = new Date()
): number {
  if (!acceso_hasta) return 0
  const diff = new Date(acceso_hasta).getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function estadoAcceso(params: {
  acceso_hasta: string | null | undefined
  trial_hasta: string | null | undefined
  now?: Date
}): EstadoAcceso {
  const now = params.now ?? new Date()
  const trialActivo = !!(params.trial_hasta && new Date(params.trial_hasta) > now)

  if (trialActivo) return 'trial'

  if (!tieneAcceso({ ...params, now })) return 'vencido'

  const dias = diasRestantesAcceso(params.acceso_hasta, now)
  if (dias > 0 && dias <= DIAS_POR_VENCER) return 'por_vencer'

  return 'activo'
}

/** Fecha efectiva de corte: el mayor entre trial y acceso_hasta futuros; null si vencido. */
export function fechaFinAcceso(params: {
  acceso_hasta: string | null | undefined
  trial_hasta: string | null | undefined
  now?: Date
}): string | null {
  const now = params.now ?? new Date()
  const dates: Date[] = []
  if (params.trial_hasta) {
    const t = new Date(params.trial_hasta)
    if (t > now) dates.push(t)
  }
  if (params.acceso_hasta) {
    const a = new Date(params.acceso_hasta)
    if (a > now) dates.push(a)
  }
  if (dates.length === 0) return null
  return new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString()
}
