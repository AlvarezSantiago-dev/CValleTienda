/**
 * Mapea pronunciaciones comunes de unidades de medida en español
 * a los valores internos del sistema (UnidadMedida).
 */
const MAPA_UNIDADES: Record<string, string> = {
  unidad: 'unidad',
  unidades: 'unidad',
  kilo: 'kg',
  kilos: 'kg',
  kilogramo: 'kg',
  kilogramos: 'kg',
  kg: 'kg',
  gramo: 'gramo',
  gramos: 'gramo',
  gr: 'gramo',
  litro: 'litro',
  litros: 'litro',
  lt: 'litro',
  metro: 'metro',
  metros: 'metro',
  'metro cuadrado': 'm2',
  'metros cuadrados': 'm2',
  'm cuadrado': 'm2',
  'metro cúbico': 'm3',
  'metros cúbicos': 'm3',
  'metro cubico': 'm3',
  'metros cubicos': 'm3',
  'm cúbico': 'm3',
  tonelada: 'tonelada',
  toneladas: 'tonelada',
  bolsa: 'bolsa',
  bolsas: 'bolsa',
  pack: 'pack',
  packs: 'pack',
  caja: 'caja',
  cajas: 'caja',
}

/**
 * Intenta parsear el texto hablado como una unidad de medida disponible.
 * Devuelve el valor interno (ej: "kg") o null si no reconoce.
 *
 * @param texto     Transcript de voz del usuario
 * @param disponibles  Array de UnidadMedida disponibles para este rubro
 */
export function parsearUnidad(texto: string, disponibles: string[]): string | null {
  const lower = texto.trim().toLowerCase()

  // Primero intentar match directo (más largo primero para evitar match parcial)
  const entradas = Object.entries(MAPA_UNIDADES).sort(([a], [b]) => b.length - a.length)
  for (const [palabra, valor] of entradas) {
    if (lower.includes(palabra) && disponibles.includes(valor)) {
      return valor
    }
  }

  // Match directo contra los valores disponibles (por si el Speech API lo devolvió ya como "kg")
  const directa = disponibles.find((u) => lower.includes(u))
  if (directa) return directa

  return null
}

/**
 * Genera un texto de opciones legible para mostrar en el HUD.
 * Ejemplo: ['unidad', 'kg', 'gramo'] → "unidad / kg / gramo"
 */
export function formatearOpcionesUnidad(disponibles: string[]): string {
  return disponibles.join(' / ')
}
