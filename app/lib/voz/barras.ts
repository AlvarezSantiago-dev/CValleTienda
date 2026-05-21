/**
 * Helpers para código de barras en flujo de voz.
 *
 * El Speech API puede devolver el número con espacios (ej: "7 7 9 0 1 2 3")
 * o pegado ("7790123"). Extraemos solo los dígitos.
 */

/**
 * Intenta parsear el texto hablado como código de barras.
 * Devuelve la cadena de dígitos o null si no alcanza mínimo 4 dígitos.
 */
export function parsearCodigoBarras(texto: string): string | null {
  // Eliminar todo excepto dígitos
  const soloDigitos = texto.replace(/[^0-9]/g, '')
  if (soloDigitos.length >= 4) return soloDigitos
  return null
}

/**
 * Valida si un código de barras tiene longitud estándar:
 * EAN-8 (8), EAN-13 (13), UPC-A (12), EAN-14 (14), Code-128 (variable ≥ 1).
 * Para uso en la UI como indicador visual, no bloquea el guardado.
 */
export function tieneFormatoEstandar(codigo: string): boolean {
  return [8, 12, 13, 14].includes(codigo.length)
}
