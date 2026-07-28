/**
 * Parseo y redondeo de cantidades (peso/medida).
 * Distinto de format-moneda: aquí el punto es SIEMPRE decimal (1.350 = 1.35 kg),
 * nunca separador de miles.
 */

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

/** Solo dígitos y un separador decimal (coma o punto). */
export function sanitizeCantidadTyping(raw: string): string {
  let out = ''
  let sepSeen = false
  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') {
      out += ch
      continue
    }
    if ((ch === ',' || ch === '.') && !sepSeen) {
      out += ch
      sepSeen = true
    }
  }
  return out
}

/**
 * Parsea cantidad ingresada por el cajero.
 * - "1,350" → 1.35
 * - "1.350" → 1.35  (punto = decimal, NO miles)
 * - Si hay coma, los puntos previos se tratan como miles (raro en peso): "1.234,5" → 1234.5
 * - Vacío / inválido → NaN
 * - Resultado con round3
 */
export function parseCantidadInput(raw: string): number {
  const cleaned = raw.replace(/\s/g, '').trim()
  if (!cleaned) return NaN

  let normalized: string
  if (cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.')
  } else {
    normalized = cleaned
  }

  const n = Number(normalized)
  if (!Number.isFinite(n)) return NaN
  return round3(n)
}

/** Formato display cantidad (es-AR, hasta 3 decimales). */
export function formatCantidadDisplay(n: number): string {
  if (!Number.isFinite(n)) return ''
  return n.toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  })
}
