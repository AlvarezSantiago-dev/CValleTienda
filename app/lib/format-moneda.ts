function round2(n: number) {
  return Math.round(n * 100) / 100
}

/** Solo dígitos, coma y punto — para edición en curso. */
export function sanitizeMoneyTyping(raw: string): string {
  return raw.replace(/[^\d.,]/g, '')
}

function formatIntegerAR(digits: string): string {
  if (!digits) return '0'
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Number(digits))
}

/**
 * Formatea el texto mientras se escribe (es-AR): miles con punto, decimal con coma.
 * No rellena `,00` hasta el blur — así se puede seguir tipeando.
 * `10000` → `10.000` · `10000,5` → `10.000,5` · `10000,50` → `10.000,50`
 */
export function formatMoneyTypingARS(raw: string): string {
  const cleaned = sanitizeMoneyTyping(raw)
  if (!cleaned) return ''

  const commaIndex = cleaned.indexOf(',')
  const hasComma = commaIndex !== -1
  const intSource = hasComma ? cleaned.slice(0, commaIndex) : cleaned
  const decSource = hasComma ? cleaned.slice(commaIndex + 1) : ''
  const intDigits = intSource.replace(/\D/g, '')
  const decDigits = decSource.replace(/\D/g, '').slice(0, 2)

  if (!intDigits && !hasComma) return ''

  const intFormatted = formatIntegerAR(intDigits)
  if (!hasComma) return intFormatted
  return `${intFormatted},${decDigits}`
}

export function caretUnitsBefore(value: string, caret: number): { intDigits: number; hasComma: boolean; decDigits: number } {
  const before = value.slice(0, Math.max(0, caret))
  const commaIndex = before.indexOf(',')
  const hasComma = commaIndex !== -1
  const intPart = hasComma ? before.slice(0, commaIndex) : before
  const decPart = hasComma ? before.slice(commaIndex + 1) : ''
  return {
    intDigits: (intPart.match(/\d/g) ?? []).length,
    hasComma,
    decDigits: (decPart.match(/\d/g) ?? []).length,
  }
}

export function caretFromUnits(
  formatted: string,
  units: { intDigits: number; hasComma: boolean; decDigits: number }
): number {
  const commaIndex = formatted.indexOf(',')
  const intPart = commaIndex === -1 ? formatted : formatted.slice(0, commaIndex)

  function afterNthDigit(s: string, n: number): number {
    if (n <= 0) return 0
    let seen = 0
    for (let i = 0; i < s.length; i++) {
      if (/\d/.test(s[i])) {
        seen += 1
        if (seen === n) return i + 1
      }
    }
    return s.length
  }

  if (!units.hasComma || commaIndex < 0) {
    return afterNthDigit(intPart, units.intDigits)
  }
  return commaIndex + 1 + afterNthDigit(formatted.slice(commaIndex + 1), units.decDigits)
}

/**
 * Parsea texto ingresado por usuario (formato es-AR) a número.
 * Vacío → 0.
 */
export function parseARSInput(raw: string): number {
  const cleaned = raw.replace(/\s/g, '').replace(/\$/g, '').trim()
  if (!cleaned) return 0

  const hasComma = cleaned.includes(',')
  const hasDot = cleaned.includes('.')

  let normalized: string

  if (hasComma) {
    // Formato AR: 12.450,50 → miles con punto, decimal con coma
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else if (hasDot) {
    // Solo puntos: si el último grupo tiene 3 dígitos, son miles
    const parts = cleaned.split('.')
    const last = parts[parts.length - 1]
    if (parts.length > 1 && last.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
      normalized = parts.join('')
    } else {
      normalized = cleaned
    }
  } else {
    normalized = cleaned
  }

  const n = Number(normalized)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, round2(n))
}

/** Formatea número como moneda ARS (con símbolo $). */
export function formatARS(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

/** Formatea número para mostrar en input (sin símbolo $). */
export function formatARSInput(n: number): string {
  if (!Number.isFinite(n) || n === 0) return ''
  return new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}
