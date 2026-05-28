/**
 * Utilidades de normalización de texto para taxonomías (categorías, tallas, colores).
 * Se aplican tanto en los componentes (feedback visual live) como en las server actions (seguridad).
 */

/**
 * Title case: primera letra de cada palabra en mayúscula, resto en minúscula.
 * "remera básica" → "Remera Básica"
 * "sancor" → "Sancor"
 * "6mm tornillo" → "6Mm Tornillo"  (conserva la posición pero capitaliza)
 */
export function titleCase(texto: string): string {
  return texto
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')
}

/**
 * Uppercase limpio: todo en mayúsculas, sin espacios múltiples.
 * "xs" → "XS"
 * "x large" → "X LARGE"
 * Usado para tallas de ropa donde el estándar universal es mayúsculas.
 */
export function upperCaseTrim(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ').toUpperCase()
}
