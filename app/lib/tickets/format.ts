/** Formato canónico: T-0042 */
export function formatNumeroTicket(prefijo: string | null | undefined, numero: number): string {
  const p = (prefijo || 'T').trim().toUpperCase()
  return `${p}-${String(numero).padStart(4, '0')}`
}

/** Extrae el entero de búsquedas: T-0042, T0042, 42, 0042 */
export function parseNumeroTicketQuery(q: string): number | null {
  const trimmed = q.trim()
  if (!trimmed) return null

  const m = trimmed.match(/^[A-Za-z]{1,6}-?(\d+)$/i)
  if (m) {
    const n = Number(m[1])
    return Number.isInteger(n) && n > 0 ? n : null
  }

  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return null
  const n = Number(digits)
  return Number.isInteger(n) && n > 0 ? n : null
}
