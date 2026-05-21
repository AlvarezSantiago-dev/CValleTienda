import type { Talla, Color } from '@/types/database'
import type { VarianteDraft } from './tipos'
import { parsearNumero } from './numeros'

/** Letras pronunciadas en español → su representación estándar */
const LETRAS_ESPAÑOL: Record<string, string> = {
  ese: 's',
  eme: 'm',
  ele: 'l',
  pe: 'p',
  ge: 'g',
  equis: 'x',
  'equis ese': 'xs',
  'equis eme': 'xm',
  'equis ele': 'xl',
  'doble ele': 'xxl',
  'doble equis ele': 'xxl',
  'triple ele': 'xxxl',
  'doble eme': 'mm',
}

function normalizarTalla(texto: string): string {
  const lower = texto.trim().toLowerCase()
  return LETRAS_ESPAÑOL[lower] ?? lower
}

function matchTalla(nombre: string, tallas: Talla[]): Talla | null {
  const norm = normalizarTalla(nombre)
  return (
    tallas.find((t) => t.nombre.toLowerCase() === norm) ??
    tallas.find((t) => t.nombre.toLowerCase().includes(norm)) ??
    null
  )
}

/**
 * Parsea un utterance como "S cinco M diez L tres" a un array de variantes.
 * Soporta letras habladas ("ese cinco eme diez ele tres").
 */
export function parsearVariantes(texto: string, tallas: Talla[]): VarianteDraft[] {
  const limpio = texto.trim().toLowerCase()
  const tokens = limpio.split(/[\s,]+/).filter(Boolean)
  const resultado: VarianteDraft[] = []
  let i = 0

  while (i < tokens.length) {
    // Saltar keyword "talla"
    if (tokens[i] === 'talla') {
      i++
      continue
    }

    // Intentar match de dos palabras primero (e.g. "equis ele" = XL)
    let talla: Talla | null = null
    let consumed = 0

    if (i + 1 < tokens.length) {
      const par = tokens[i] + ' ' + tokens[i + 1]
      talla = matchTalla(par, tallas)
      if (talla) consumed = 2
    }

    if (!talla) {
      talla = matchTalla(tokens[i], tallas)
      if (talla) consumed = 1
    }

    if (talla) {
      i += consumed
      let stock = 1
      if (i < tokens.length) {
        const n = parsearNumero(tokens[i])
        if (n !== null && n > 0) {
          stock = Math.round(n)
          i++
        }
      }
      resultado.push({
        label: talla.nombre,
        tallaId: talla.id,
        colorId: null,
        colorLabel: null,
        stock,
        stockMinimo: 0,
      })
    } else {
      i++
    }
  }

  return resultado
}

// ------------------------------------------------------------------
// Color helpers (Var2)
// ------------------------------------------------------------------

/**
 * Intenta hacer match del texto contra los colores disponibles.
 */
export function matchColor(texto: string, colores: Color[]): Color | null {
  const lower = texto.trim().toLowerCase()
  return (
    colores.find((c) => c.nombre.toLowerCase() === lower) ??
    colores.find((c) => lower.includes(c.nombre.toLowerCase())) ??
    null
  )
}

/**
 * Asigna colores a variantes existentes.
 *
 * - Si el texto es un único color (ej: "azul") → aplica a todas las variantes.
 * - Si el texto menciona talla+color (ej: "S rojo M azul L negro") →
 *   asocia por talla.
 */
export function parsearColoresVariantes(
  texto: string,
  variantesDraft: VarianteDraft[],
  colores: Color[]
): VarianteDraft[] {
  const lower = texto.trim().toLowerCase()

  // Caso 1: un único color para todas las variantes
  const colorUnico = matchColor(lower, colores)
  if (colorUnico) {
    return variantesDraft.map((v) => ({
      ...v,
      colorId: colorUnico.id,
      colorLabel: colorUnico.nombre,
    }))
  }

  // Caso 2: por variante ("S rojo M azul")
  const result = variantesDraft.map((v) => ({ ...v }))

  for (let i = 0; i < result.length; i++) {
    const tallaLower = result[i].label.toLowerCase()
    const idx = lower.indexOf(tallaLower)
    if (idx === -1) continue

    const afterTalla = lower.slice(idx + tallaLower.length).trim()
    // Buscar el primer color que aparezca justo después de la talla
    for (const color of colores) {
      if (afterTalla.startsWith(color.nombre.toLowerCase())) {
        result[i] = {
          ...result[i],
          colorId: color.id,
          colorLabel: color.nombre,
        }
        break
      }
    }
  }

  return result
}
