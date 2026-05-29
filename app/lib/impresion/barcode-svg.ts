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

// =============================================================
// CODE-128B — soporta ASCII 32-126 (cualquier código alfanumérico)
// Referencia: ISO/IEC 15417. Cada símbolo = 6 elementos (3 barras + 3 espacios)
// con anchos 1-4 que suman 11 módulos.
// =============================================================

/** Patrones de anchos (bar-space-bar-space-bar-space) para los 107 símbolos Code128.
 *  Índices 0-94: datos Code128B (char = valor + 32).
 *  Índice 103: Start A | 104: Start B | 105: Start C.
 *  Stop se trata aparte (7 elementos: 2331112). */
const C128: readonly string[] = [
  '212222','222122','222221','121223','121322','131222','122213','122312',
  '132212','221213','221312','231212','112232','122132','122231','113222',
  '123122','123221','223211','221132','221231','213212','223112','312131',
  '311222','321122','321221','312212','322112','322211','212123','212321',
  '232121','111323','131123','131321','112313','132113','132311','211313',
  '231113','231311','112133','112331','132131','113123','113321','133121',
  '313121','211331','231131','213113','213311','213131','311123','311321',
  '331121','312113','312311','332111','314111','221411','431111','111224',
  '111422','121124','121421','141122','141221','112214','112412','122114',
  '122411','142112','142211','241211','221114','413111','241112','134111',
  '111242','121142','121241','114212','124112','124211','411212','421112',
  '421211','212141','214121','412121','111143','111341','131141','114113',
  '114311','411113','411311','113141','114131','311141','411131',
  // 103 = Start A, 104 = Start B, 105 = Start C
  '211412','211214','211232',
]
const C128_STOP = '2331112' // 7 elementos, 13 módulos

function patToModules(pat: string): number[] {
  const out: number[] = []
  for (let i = 0; i < pat.length; i++) {
    const w = +pat[i]
    const bar = i % 2 === 0 ? 1 : 0
    for (let j = 0; j < w; j++) out.push(bar)
  }
  return out
}

/**
 * Convierte cualquier cadena ASCII (32-126) a módulos Code128B.
 * Devuelve null si contiene caracteres fuera de rango.
 */
export function code128Modules(text: string): number[] | null {
  for (const ch of text) {
    const c = ch.charCodeAt(0)
    if (c < 32 || c > 126) return null
  }

  // Símbolo Start B = índice 104
  const symbols = [104]
  for (const ch of text) symbols.push(ch.charCodeAt(0) - 32)

  // Checksum: Start B (104) + sum of (position * value) mod 103
  let check = 104
  for (let i = 0; i < text.length; i++) {
    check += (i + 1) * (text.charCodeAt(i) - 32)
  }
  symbols.push(check % 103)

  const modules: number[] = []
  for (const sym of symbols) modules.push(...patToModules(C128[sym]))
  modules.push(...patToModules(C128_STOP))
  return modules
}
