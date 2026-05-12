// =============================================================
// EAN-13 BARCODE — generador y validador
// Formato: 12 dígitos + 1 checksum (Mod-10).
// El prefijo recomendado para uso interno (no GTIN oficial) es
// "200" - "299" según ISO/IEC, reservado para "in-store".
// =============================================================

/**
 * Calcula el dígito de control Mod-10 de un string de 12 dígitos.
 */
function ean13Checksum(twelveDigits: string): number {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const d = Number(twelveDigits[i])
    sum += i % 2 === 0 ? d : d * 3
  }
  return (10 - (sum % 10)) % 10
}

/**
 * Genera un código EAN-13 aleatorio para uso interno.
 * @param prefix prefijo de 1-3 dígitos (default '200', "in-store")
 */
export function generateEAN13(prefix: string = '200'): string {
  if (!/^\d{1,12}$/.test(prefix)) {
    throw new Error('El prefijo debe contener entre 1 y 12 dígitos')
  }
  const remaining = 12 - prefix.length
  let body = prefix
  for (let i = 0; i < remaining; i++) {
    body += Math.floor(Math.random() * 10).toString()
  }
  return body + ean13Checksum(body).toString()
}

/**
 * Valida un código EAN-13. Acepta solamente 13 dígitos numéricos
 * con checksum Mod-10 correcto.
 */
export function validateEAN13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false
  const body = code.slice(0, 12)
  const expected = ean13Checksum(body)
  return Number(code[12]) === expected
}
