function round2(n: number) {
  return Math.round(n * 100) / 100
}

/** Solo dígitos, coma y punto — para edición en curso. */
export function sanitizeMoneyTyping(raw: string): string {
  return raw.replace(/[^\d.,]/g, '')
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
