/**
 * lib/pos/balanza.ts
 *
 * Utilidades para parsear códigos de barras generados por balanzas electrónicas.
 *
 * Formato estándar (GS1 / uso interno, prefijo "2x"):
 *
 *   EAN-13:  P C C C C C V V V V V D
 *            │ └──────┘ └──────┘ └── dígito verificador
 *            │   PLU      valor
 *            └── prefijo "2" (uso interno)
 *
 *   - PLU (posiciones 1-5): código interno del producto en la balanza
 *   - VALOR (posiciones 6-10): precio o peso según configuración de la balanza
 *     • Precio embebido: valor / 100  → precio en ARS (ej: 01250 → $12.50)
 *     • Peso embebido:  valor / 1000 → kg        (ej: 01350 → 1.350 kg)
 *
 * El prefijo puede ser 20–29. Lo más común en Argentina: 20, 21, 22.
 */

export interface BalanzaParseado {
  /** Dígitos 2–6 del EAN-13 (PLU del producto, 5 caracteres) */
  codigoInterno: string
  /** Los 5 dígitos de valor como número entero */
  valor: number
  /** Precio en ARS (valor / 100) — válido para formato 'precio' */
  precio: number
  /** Peso en kg (valor / 1000) — válido para formato 'peso' */
  peso: number
}

/** Regex: EAN-13 de uso interno (prefijo 20–29, exactamente 13 dígitos) */
const RE_BALANZA = /^2\d{12}$/

/**
 * Devuelve true si el string parece un EAN-13 de balanza (uso interno).
 * NO verifica el dígito de control para no bloquear balanzas con cálculo distinto.
 */
export function esCodigoBalanza(barcode: string): boolean {
  return RE_BALANZA.test(barcode)
}

/**
 * Parsea un código de balanza EAN-13.
 * @returns BalanzaParseado si el formato es válido, null si no aplica.
 */
export function parseBalanza(barcode: string): BalanzaParseado | null {
  if (!esCodigoBalanza(barcode)) return null

  const codigoInterno = barcode.slice(1, 6)   // chars 1-5 (0-indexed)
  const valorStr = barcode.slice(6, 11)        // chars 6-10
  const valor = parseInt(valorStr, 10)

  if (isNaN(valor)) return null

  return {
    codigoInterno,
    valor,
    precio: valor / 100,
    peso: valor / 1000,
  }
}
