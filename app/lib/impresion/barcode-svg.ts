// =============================================================
// EAN-13 → módulos (0/1) para renderizar como SVG sin librerías.
// Estructura: 3 (start) + 7×6 (left) + 5 (middle) + 7×6 (right) + 3 (end) = 95.
// =============================================================

import { validateEAN13 } from '@/lib/barcode'

// L-code: para mitad izquierda cuando paridad es 'L'
const L_PATTERNS = [
  '0001101', '0011001', '0010011', '0111101', '0100011',
  '0110001', '0101111', '0111011', '0110111', '0001011',
]

// G-code: para mitad izquierda cuando paridad es 'G' (espejo de R)
const G_PATTERNS = [
  '0100111', '0110011', '0011011', '0100001', '0011101',
  '0111001', '0000101', '0010001', '0001001', '0010111',
]

// R-code: para mitad derecha (siempre)
const R_PATTERNS = [
  '1110010', '1100110', '1101100', '1000010', '1011100',
  '1001110', '1010000', '1000100', '1001000', '1110100',
]

// Patrón de paridad de los 6 dígitos izquierdos según el primer dígito.
// 'L' = L_PATTERNS, 'G' = G_PATTERNS
const FIRST_DIGIT_PARITY = [
  'LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG',
  'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL',
]

const START_END = '101'
const MIDDLE = '01010'

/**
 * Convierte un código EAN-13 válido a una secuencia de módulos (0 = espacio, 1 = barra).
 * Devuelve null si el código no es válido.
 */
export function ean13Modules(code: string): number[] | null {
  if (!validateEAN13(code)) return null

  const first = Number(code[0])
  const left = code.slice(1, 7)
  const right = code.slice(7, 13)
  const parity = FIRST_DIGIT_PARITY[first]

  let bits = START_END
  for (let i = 0; i < 6; i++) {
    const d = Number(left[i])
    bits += parity[i] === 'L' ? L_PATTERNS[d] : G_PATTERNS[d]
  }
  bits += MIDDLE
  for (let i = 0; i < 6; i++) {
    const d = Number(right[i])
    bits += R_PATTERNS[d]
  }
  bits += START_END

  return Array.from(bits, (b) => (b === '1' ? 1 : 0))
}

/**
 * Total de módulos en un EAN-13: 95.
 */
export const EAN13_MODULES = 95
