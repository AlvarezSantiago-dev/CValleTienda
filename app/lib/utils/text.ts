/**
 * Utilidades de normalización de texto para taxonomías (categorías, tallas, colores).
 * Preferir aplicar solo al confirmar (no en cada tecla): trim en vivo bloquea espacios.
 */

/**
 * Solo colapsa espacios y trim. Conserva mayúsculas/minúsculas del usuario.
 * Ideal para marcas, presentaciones y nombres libres.
 */
export function softTrim(texto: string): string {
  return texto.replace(/\s+/g, ' ').trim()
}

/**
 * Title case: primera letra de cada palabra en mayúscula, resto en minúscula.
 * "remera básica" → "Remera Básica"
 * Aplicar al confirmar, no mientras se escribe.
 */
export function titleCase(texto: string): string {
  return softTrim(texto)
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')
}

/**
 * Uppercase limpio: todo en mayúsculas, espacios colapsados.
 * "xs" → "XS" · "x large" → "X LARGE"
 * Usado para tallas de ropa. Aplicar al confirmar, no mientras se escribe.
 */
export function upperCaseTrim(texto: string): string {
  return softTrim(texto).toUpperCase()
}
