/**
 * Helpers de formato compartidos.
 * Usados por módulos nuevos. Componentes legacy (POS, ventas, caja, configuracion)
 * todavía tienen sus propias copias inline; migrar oportunisticamente.
 */

export function formatARS(n: number | null | undefined): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(Number(n ?? 0))
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { dateStyle: 'short' })
}

export function formatNumber(n: number | null | undefined): string {
  return new Intl.NumberFormat('es-AR').format(Number(n ?? 0))
}

export function formatSignedDelta(n: number): string {
  if (n === 0) return '0'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n}`
}
