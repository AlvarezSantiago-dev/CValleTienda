/**
 * Helpers de formato compartidos.
 * Fechas: delegadas a lib/datetime.ts (timezone Argentina).
 */

export { formatDateTime, formatDate, formatDateLong } from '@/lib/datetime'

export function formatARS(n: number | null | undefined): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(Number(n ?? 0))
}

export function formatNumber(n: number | null | undefined): string {
  return new Intl.NumberFormat('es-AR').format(Number(n ?? 0))
}

export function formatSignedDelta(n: number): string {
  if (n === 0) return '0'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n}`
}

export {
  parseARSInput,
  formatARSInput,
  sanitizeMoneyTyping,
} from '@/lib/format-moneda'

export {
  parseCantidadInput,
  sanitizeCantidadTyping,
  formatCantidadDisplay,
  round2 as roundMoney2,
  round3,
} from '@/lib/format-cantidad'
