/**
 * Fechas y horas de negocio — siempre en America/Argentina/Buenos_Aires.
 * Alineado con build_payload_ticket_venta en Postgres y emails de cierre.
 */

export const TIENDA_TZ = 'America/Argentina/Buenos_Aires' as const

const ISO_YMD = /^\d{4}-\d{2}-\d{2}$/

function assertYmd(ymd: string): void {
  if (!ISO_YMD.test(ymd)) {
    throw new Error(`Fecha YYYY-MM-DD inválida: ${ymd}`)
  }
}

/** YYYY-MM-DD del calendario en Argentina para un instante dado. */
export function ymdArgentina(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: TIENDA_TZ })
}

/** YYYY-MM-DD en Argentina a partir de un ISO timestamptz. */
export function ymdFromIso(iso: string): string {
  return ymdArgentina(new Date(iso))
}

/** YMD de hoy en Argentina. */
export function hoyArgentinaYmd(): string {
  return ymdArgentina(new Date())
}

/** Suma días a un YMD (calendario). */
export function addDaysYmd(ymd: string, days: number): string {
  assertYmd(ymd)
  const anchor = new Date(`${ymd}T12:00:00-03:00`)
  anchor.setUTCDate(anchor.getUTCDate() + days)
  return ymdArgentina(anchor)
}

/** Inicio del día calendario AR (00:00:00 ART) como ISO UTC. */
export function inicioDiaArgentina(ymd: string): string {
  assertYmd(ymd)
  return new Date(`${ymd}T00:00:00-03:00`).toISOString()
}

/** Inicio del día siguiente (para queries con `<`). */
export function inicioDiaSiguienteArgentina(ymd: string): string {
  return inicioDiaArgentina(addDaysYmd(ymd, 1))
}

/** Partes de fecha/hora en Argentina para el instante dado. */
export function partsArgentina(date: Date = new Date()): {
  year: number
  month: number
  day: number
} {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIENDA_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const parts = fmt.formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0)
  return { year: get('year'), month: get('month'), day: get('day') }
}

/** YYYY-MM del mes actual en Argentina. */
export function mesActualISOArgentina(): string {
  const { year, month } = partsArgentina()
  return `${year}-${String(month).padStart(2, '0')}`
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/** Primer día del mes AR como ISO UTC (inicio de mes). */
export function inicioMesArgentina(year: number, month: number): string {
  return inicioDiaArgentina(`${year}-${String(month).padStart(2, '0')}-01`)
}

/** Fin exclusivo del rango “mes hasta hoy” en AR. */
export function finHastaHoyArgentina(): string {
  return inicioDiaSiguienteArgentina(hoyArgentinaYmd())
}

/** Fin exclusivo del mismo día del mes anterior (clamp si el mes es más corto). */
export function finMismoDiaMesAnteriorArgentina(): string {
  const { year, month, day } = partsArgentina()
  const prevYear = month === 1 ? year - 1 : year
  const prevMonth = month === 1 ? 12 : month - 1
  const clampedDay = Math.min(day, daysInMonth(prevYear, prevMonth))
  const ymd = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`
  return inicioDiaSiguienteArgentina(ymd)
}

export function formatDateTime(
  iso: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'short', timeStyle: 'short' }
): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-AR', { ...options, timeZone: TIENDA_TZ })
}

export function formatDate(
  iso: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'short' }
): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', { ...options, timeZone: TIENDA_TZ })
}

export function formatDateLong(iso: string | null | undefined): string {
  return formatDateTime(iso, { dateStyle: 'long', timeStyle: 'short' })
}

/** Formatea un YYYY-MM-DD como fecha larga en Argentina. */
export function formatYmdLong(ymd: string): string {
  assertYmd(ymd)
  return formatDate(`${ymd}T12:00:00-03:00`, { dateStyle: 'long' })
}

/** Fecha de hoy legible (dashboard, header). */
export function formatHoyLegible(
  options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
): string {
  return new Date().toLocaleDateString('es-AR', { ...options, timeZone: TIENDA_TZ })
}
