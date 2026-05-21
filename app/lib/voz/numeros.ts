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
 * Chrome en español generalmente emite dígitos directamente ("2500"),
 * pero si emite palabras ("dos mil quinientos") también funciona.
 */
export function parsearNumero(texto: string): number | null {
  const limpio = texto.trim().toLowerCase().replace(/\s+/g, ' ')

  // --- Intento directo: solo dígitos (con punto o coma como separador) ---
  const soloDigitos = limpio.replace(/[$.]/g, '').replace(/,/g, '.')
  const directMatch = soloDigitos.match(/^(\d+(?:\.\d+)?)$/)
  if (directMatch) {
    const n = parseFloat(directMatch[1])
    if (!isNaN(n)) return n
  }

  // --- Dígitos incrustados en texto ("precio 2500 pesos") ---
  const embeddedMatch = limpio.replace(/[$.]/g, '').replace(/,/g, '.').match(/\b(\d+(?:\.\d+)?)\b/)
  if (embeddedMatch) {
    const n = parseFloat(embeddedMatch[1])
    if (!isNaN(n)) return n
  }

  // --- Parser de palabras ---
  const tokens = limpio.split(/\s+/).filter(Boolean)
  let total = 0
  let current = 0
  let hasValue = false

  for (const token of tokens) {
    if (token === 'y' || token === 'con' || token === 'pesos') continue

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
  }

  if (!hasValue) return null
  return total + current
}
