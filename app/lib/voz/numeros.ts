const UNIDADES: Record<string, number> = {
  cero: 0,
  un: 1, uno: 1, una: 1,
  dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12,
  trece: 13, catorce: 14, quince: 15,
  'dieciséis': 16, dieciseis: 16,
  diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20,
  veintiuno: 21, veintidós: 22, veintidos: 22,
  veintitrés: 23, veintitres: 23, veinticuatro: 24,
  veinticinco: 25, veintiséis: 26, veintiseis: 26,
  veintisiete: 27, veintiocho: 28, veintinueve: 29,
}

const DECENAS: Record<string, number> = {
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60,
  setenta: 70, ochenta: 80, noventa: 90,
}

const CENTENAS: Record<string, number> = {
  cien: 100, ciento: 100,
  doscientos: 200, doscientas: 200,
  trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400,
  quinientos: 500, quinientas: 500,
  seiscientos: 600, seiscientas: 600,
  setecientos: 700, setecientas: 700,
  ochocientos: 800, ochocientas: 800,
  novecientos: 900, novecientas: 900,
}

/**
 * Convierte texto hablado (o dígitos) a número.
 * Soporta:
 *   - Dígitos puros:      "2500", "2.500"  → 2500
 *   - Palabras puras:     "veinte mil"     → 20000
 *   - Mixto:              "20 mil", "5 mil 500" → 20000, 5500
 *   - Con unidad:         "veinte mil pesos" → 20000
 */
export function parsearNumero(texto: string): number | null {
  // 1. Normalizar: minúsculas, colapsar espacios
  const limpio = texto.trim().toLowerCase().replace(/\s+/g, ' ')

  // 2. Intentar parseo directo de dígitos puros
  //    "2500" → 2500 | "2.500" (miles con punto) → 2500 | "2,5" (decimal) → 2.5
  const sinPuntoMiles = limpio.replace(/(\d)\.(\d{3})/g, '$1$2') // "2.500" → "2500"
  const conComa = sinPuntoMiles.replace(/,/g, '.')               // "2,5"  → "2.5"
  const directMatch = conComa.match(/^(\d+(?:\.\d+)?)$/)
  if (directMatch) {
    const n = parseFloat(directMatch[1])
    if (!isNaN(n)) return n
  }

  // 3. Parser de tokens mixtos (palabras + dígitos)
  //    Eliminar puntos de miles de tokens antes de parsear ("2.500" → "2500")
  const tokenizeable = limpio.replace(/(\d)\.(\d{3})/g, '$1$2')
  const tokens = tokenizeable.split(/\s+/).filter(Boolean)

  let total = 0
  let current = 0
  let hasValue = false

  for (const token of tokens) {
    // Palabras ignoradas
    if (['y', 'con', 'pesos', 'peso', 'centavo', 'centavos', 'de', 'la', 'el'].includes(token)) continue

    // Multiplicadores
    if (token === 'mil' || token === 'miles') {
      current = current === 0 ? 1 : current
      total += current * 1000
      current = 0
      hasValue = true
      continue
    }

    if (token === 'millón' || token === 'millon' || token === 'millones') {
      current = current === 0 ? 1 : current
      total += current * 1_000_000
      current = 0
      hasValue = true
      continue
    }

    // Token numérico puro (ej: "20" en "20 mil", "500" en "5 mil 500")
    if (/^\d+$/.test(token)) {
      current += parseInt(token, 10)
      hasValue = true
      continue
    }

    if (token in CENTENAS) {
      current += CENTENAS[token]
      hasValue = true
      continue
    }

    if (token in DECENAS) {
      current += DECENAS[token]
      hasValue = true
      continue
    }

    if (token in UNIDADES) {
      current += UNIDADES[token]
      hasValue = true
      continue
    }
    // Token desconocido → ignorar (permite "precio 2500 pesos" sin crashear)
  }

  if (!hasValue) return null
  return total + current
}
