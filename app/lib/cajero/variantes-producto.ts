// =============================================================
// lib/cajero/variantes-producto.ts
// Combinaciones var1 × var2 para el alta por voz.
// Var1 = tallas (Marca / Talla / …). Var2 = colores (Presentación / Color / …).
// =============================================================

export interface ComboVariante {
  var1: string | null
  var2: string | null
  etiqueta: string
}

const MAX_VARIANTES = 50

function uniq(nombres: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const n of nombres) {
    const t = n.trim()
    if (!t) continue
    const k = t.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(t)
  }
  return out
}

/** Acepta array o "S, M y L" / "1.5, 3 litros". */
export function parsearListaNombres(raw: unknown): string[] {
  if (raw == null) return []
  if (Array.isArray(raw)) return uniq(raw.flatMap((x) => parsearListaNombres(x)))
  if (typeof raw !== 'string') return []
  return uniq(
    raw
      .split(/[,;]| y | e /i)
      .map((s) => s.trim())
      .filter(Boolean)
  )
}

export function armarCombosVariantes(
  var1: string[],
  var2: string[]
): ComboVariante[] {
  const a = uniq(var1)
  const b = uniq(var2)

  let combos: ComboVariante[]
  if (a.length === 0 && b.length === 0) {
    combos = [{ var1: null, var2: null, etiqueta: 'Única' }]
  } else if (a.length > 0 && b.length === 0) {
    combos = a.map((v) => ({ var1: v, var2: null, etiqueta: v }))
  } else if (a.length === 0 && b.length > 0) {
    combos = b.map((v) => ({ var1: null, var2: v, etiqueta: v }))
  } else {
    combos = []
    for (const x of a) {
      for (const y of b) {
        combos.push({ var1: x, var2: y, etiqueta: `${x} · ${y}` })
      }
    }
  }

  if (combos.length > MAX_VARIANTES) {
    throw new Error(`Demasiadas combinaciones (${combos.length}). Máximo ${MAX_VARIANTES}.`)
  }
  return combos
}
