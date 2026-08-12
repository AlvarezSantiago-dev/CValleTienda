import { draftVacio, type CatalogoParse, type CargaExpressDraft, type ParseResult, type ParseWarning } from './tipos'

const PLURALES_COLOR: Record<string, string> = {
  rojos: 'rojo',
  azules: 'azul',
  verdes: 'verde',
  amarillos: 'amarillo',
  negros: 'negro',
  blancos: 'blanco',
  grises: 'gris',
  rosas: 'rosa',
  naranjas: 'naranja',
  violetas: 'violeta',
  bordos: 'bordo',
  bordós: 'bordo',
  beiges: 'beige',
  celestes: 'celeste',
  marrones: 'marron',
  marróns: 'marron',
}

/** Palabra → cantidad (dictado) */
const CANTIDAD_HABLA: Record<string, number> = {
  un: 1,
  una: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  veinte: 20,
  treinta: 30,
}

const TALLES_HABLA: Record<string, string> = {
  'equis ese': 'XS',
  'equis eme': 'S',
  'equis ele': 'XL',
  'doble equis ele': 'XXL',
  'doble ele': 'XXL',
  'doble xl': 'XXL',
  'doble x l': 'XXL',
  'triple ele': 'XXXL',
  'triple xl': 'XXXL',
  'triple equis ele': 'XXXL',
  'extra large': 'XL',
  'extra extra large': 'XXL',
  ese: 'S',
  eme: 'M',
  ele: 'L',
}

const TALLES_CONOCIDOS = new Set([
  'XXS',
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  'XXXL',
  'XXXXL',
  '2XL',
  '3XL',
  'U',
  'ÚNICO',
  'UNICO',
  'UNIQUE',
])

const STOP_COLORES =
  /^(un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|precio|precios|compra|compras|venta|ventas|categor[ií]a|talle|talla|talles|con|el|la|de|del|pesos?|unidades?|marca|tambien|también|hay|stock|es|de)$/i

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function singularColor(token: string): string {
  const n = norm(token)
  if (PLURALES_COLOR[n]) return PLURALES_COLOR[n]
  if (n.endsWith('es') && n.length > 4 && !n.endsWith('ues')) return n.slice(0, -2)
  if (n.endsWith('s') && n.length > 3) return n.slice(0, -1)
  return n
}

function titleColor(nombre: string): string {
  const s = nombre.trim()
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function titleNombreProducto(nombre: string): string {
  return nombre
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')
}

function limpiarToken(token: string): string {
  return token.replace(/^[("'[{]+/, '').replace(/[)"'\],.:;!?]+$/g, '')
}

/** Montos AR: 12.500 → 12500; 12,50 → 12.5; 6500 → 6500 */
export function parseMontoAR(raw: string): number | null {
  const s = raw.trim().replace(/\$/g, '').replace(/\s/g, '')
  if (!s) return null
  // Miles con punto: 12.500 / 1.200.000
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    return parseInt(s.replace(/\./g, ''), 10)
  }
  // Decimal con coma: 12,50
  if (/^\d+,\d{1,2}$/.test(s)) {
    return parseFloat(s.replace(',', '.'))
  }
  // Entero
  if (/^\d+$/.test(s)) return parseInt(s, 10)
  // Decimal con 1–2 dígitos tras punto (12.5 / 12.50) — no miles
  if (/^\d+\.\d{1,2}$/.test(s)) return parseFloat(s)
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function parseCantidadToken(token: string): number | null {
  const t = limpiarToken(token)
  const n = norm(t)
  if (n in CANTIDAD_HABLA) return CANTIDAD_HABLA[n]
  if (/^\d+$/.test(t)) {
    const v = parseInt(t, 10)
    return v >= 0 && v <= 99999 ? v : null
  }
  return null
}

function normalizarTalleToken(raw: string): string {
  const cleaned = limpiarToken(raw)
  const n = norm(cleaned).replace(/\./g, '')
  if (TALLES_HABLA[n]) return TALLES_HABLA[n]
  const up = cleaned.trim().toUpperCase().replace(/\s+/g, '')
  if (up === '2XL') return 'XXL'
  if (up === '3XL') return 'XXXL'
  return up
}

/** ¿Parece un talle de ropa? (no marcas tipo Sancor) */
export function esTalleRopa(nombre: string): boolean {
  const up = normalizarTalleToken(nombre)
  if (!up) return false
  if (TALLES_CONOCIDOS.has(up)) return true
  if (/^\d{1,2}$/.test(up) && Number(up) >= 20 && Number(up) <= 60) return true
  if (/^X{0,5}[SML]$/.test(up)) return true
  if (/^[2-5]XL$/.test(up)) return true
  return false
}

/** Colores basura de otros rubros (1kg, 500ml…) */
export function esColorBasura(nombre: string): boolean {
  const n = nombre.trim()
  if (/^\d/.test(n)) return true
  if (/\b(\d+\s*)?(kg|g|ml|l|lt|cm|mm)\b/i.test(n)) return true
  return false
}

const TALLE_SOLO_COLOR = 'Único'

const COLORES_CONOCIDOS = new Set([
  'rojo',
  'azul',
  'verde',
  'amarillo',
  'negro',
  'blanco',
  'gris',
  'rosa',
  'naranja',
  'violeta',
  'bordo',
  'beige',
  'celeste',
  'marron',
  'marrón',
  'fucsia',
  'bordo',
  'coral',
  'ocre',
  'mostaza',
  'bordo',
])

function esPalabraColor(token: string, catalogoColores: string[]): boolean {
  const s = singularColor(limpiarToken(token))
  if (s.length < 3) return false
  if (STOP_COLORES.test(s)) return false
  if (esColorBasura(s)) return false
  if (COLORES_CONOCIDOS.has(s)) return true
  if (PLURALES_COLOR[norm(token)]) return true
  if (catalogoColores.some((c) => norm(c) === s || singularColor(c) === s)) return true
  // color desconocido pero parece palabra (no número, no talle)
  if (/^\d+$/.test(s)) return false
  if (esTalleRopa(s)) return false
  return /^[a-záéíóúñ]+$/i.test(s) && s.length >= 3 && s.length <= 20
}

function esTalleToken(token: string, catalogoTallas: string[]): boolean {
  const up = normalizarTalleToken(token)
  if (!up) return false

  // Dígitos puros: solo calzado/ropa 20–60 o presentes en catálogo (nunca 1–19)
  if (/^\d+$/.test(up)) {
    if (catalogoTallas.some((t) => t.toUpperCase() === up)) return true
    const n = Number(up)
    return n >= 20 && n <= 60
  }

  if (TALLES_CONOCIDOS.has(up)) return true
  if (esTalleRopa(up)) return true
  if (catalogoTallas.some((t) => t.toUpperCase() === up)) return true
  return false
}

function matchCatalogoNombre(nombre: string, catalogo: { nombre: string }[]): string | null {
  const n = norm(nombre)
  const hit = catalogo.find((c) => norm(c.nombre) === n)
  return hit?.nombre ?? null
}

/** Reescribe frases de talle habladas a códigos antes de tokenizar. */
function normalizarFrasesTalle(texto: string): string {
  let work = texto
  // Orden: frases más largas primero
  const frases = Object.entries(TALLES_HABLA).sort((a, b) => b[0].length - a[0].length)
  for (const [frase, code] of frases) {
    if (!frase.includes(' ')) continue
    const re = new RegExp(`\\b${frase.replace(/\s+/g, '\\s+')}\\b`, 'gi')
    work = work.replace(re, code)
  }
  // "doble XL" / "doble xl" ya está en TALLES_HABLA; también "2 xl"
  work = work.replace(/\b2\s*xl\b/gi, 'XXL')
  work = work.replace(/\b3\s*xl\b/gi, 'XXXL')
  return work
}

function extractQuotedName(texto: string): { nombre: string | null; rest: string } {
  const m = texto.match(/"([^"]+)"|'([^']+)'/)
  if (!m) return { nombre: null, rest: texto }
  const nombre = (m[1] ?? m[2]).trim()
  return { nombre: titleNombreProducto(nombre), rest: texto.replace(m[0], ' ') }
}

function extractNombreKeyword(texto: string): { nombre: string | null; rest: string } {
  // Preferir forma hablada: "crear producto con el nombre X colores…"
  const stop =
    String.raw`\s+colou?res?\b|\s+colou?r\b|\s+marca\b|\s+talle|\s+talla|\s+precio|\s+compra|\s+compras|\s+venta|\s+categor|\s+la\s+categor|$`
  const patterns: RegExp[] = [
    new RegExp(
      String.raw`(?:crear\s+)?producto\s+con\s+(?:el\s+)?nombre\s+(.+?)(?=${stop})`,
      'i'
    ),
    new RegExp(
      String.raw`(?:con\s+(?:el\s+)?)?nombre\s*[:=]?\s+(.+?)(?=${stop})`,
      'i'
    ),
    // "Producto: X" / "Producto X" — \s* tras : opcional
    new RegExp(String.raw`producto\s*[:=]?\s+(.+?)(?=${stop})`, 'i'),
  ]

  for (const re of patterns) {
    const m = texto.match(re)
    if (!m) continue
    let nombre = m[1].trim().replace(/^["']|["']$/g, '')
    nombre = nombre
      .replace(/^(con\s+(el\s+)?)?nombre\s+/i, '')
      .replace(/^crear\s+/i, '')
      .replace(/[.,;:]+$/g, '')
      .trim()
    if (nombre.length < 2) continue
    return { nombre: titleNombreProducto(nombre), rest: texto.replace(m[0], ' ') }
  }
  return { nombre: null, rest: texto }
}

/** Dictado libre sin "producto/nombre": "buzo de algodon color azul marca nike talle L …" */
function extractNombreLibre(texto: string): { nombre: string | null; rest: string } {
  if (/^(crear\s+)?producto\b/i.test(texto.trim())) {
    return { nombre: null, rest: texto }
  }
  const m = texto.match(
    /^(.+?)(?=\s+(?:talle|talla|talles|precio|precios|compra|compras|venta|ventas|la\s+categor|categor)|$)/i
  )
  if (!m) return { nombre: null, rest: texto }
  let raw = m[1].trim()
  if (raw.length < 3) return { nombre: null, rest: texto }
  raw = raw
    .replace(/\s+colou?res?\s+[a-záéíóúñ,\s]+/gi, ' ')
    .replace(/\s+colou?r\s+[a-záéíóúñ]+/gi, ' ')
    .replace(/\s+marca\s+([a-záéíóúñ0-9]+)/gi, ' $1')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:]+$/g, '')
    .trim()
  if (raw.length < 3) return { nombre: null, rest: texto }
  return { nombre: titleNombreProducto(raw), rest: texto }
}

function extractPrecio(texto: string, tipo: 'compra' | 'venta'): { valor: number | null; rest: string } {
  const patterns =
    tipo === 'compra'
      ? [
          /precios?\s*(?:de\s*)?compras?\s*[:=]?\s*\$?\s*([\d.]+(?:,\d{1,2})?)/i,
          /compras?\s*[:=]?\s*\$?\s*([\d.]+(?:,\d{1,2})?)/i,
        ]
      : [
          /precios?\s*(?:de\s*)?ventas?\s*[:=]?\s*\$?\s*([\d.]+(?:,\d{1,2})?)/i,
          /ventas?\s*[:=]?\s*\$?\s*([\d.]+(?:,\d{1,2})?)/i,
        ]

  for (const re of patterns) {
    const m = texto.match(re)
    if (!m) continue
    const valor = parseMontoAR(m[1])
    if (valor != null && valor >= 0) {
      return { valor, rest: texto.replace(m[0], ' ') }
    }
  }
  return { valor: null, rest: texto }
}

/** "el precio es de 50000 pesos" / "precio 50000" (sin compra/venta) */
function extractPrecioGenerico(texto: string): { valor: number | null; rest: string } {
  const patterns = [
    /(?:el\s+)?precios?\s+es\s+(?:de\s+)?\$?\s*([\d.]+(?:,\d{1,2})?)(?:\s*pesos?)?/i,
    /(?:el\s+)?precios?\s*[:=]\s*\$?\s*([\d.]+(?:,\d{1,2})?)(?:\s*pesos?)?/i,
  ]
  for (const re of patterns) {
    const m = texto.match(re)
    if (!m) continue
    const valor = parseMontoAR(m[1])
    if (valor != null && valor >= 0) {
      return { valor, rest: texto.replace(m[0], ' ') }
    }
  }
  return { valor: null, rest: texto }
}

function extractCategoria(texto: string): { categoria: string | null; rest: string } {
  const patterns = [
    /la\s+categor[ií]a\s+es\s+([a-záéíóúñ0-9\s]+?)(?=\s*$|[.,;]|precio|compra|venta|color|talle)/i,
    /categor[ií]a\s*(?:es\s*|[:=]\s*)([a-záéíóúñ0-9\s]+?)(?=\s*$|[.,;]|precio|compra|venta|color|talle)/i,
  ]
  for (const re of patterns) {
    const m = texto.match(re)
    if (!m) continue
    const categoria = m[1].trim().replace(/\s+/g, ' ')
    if (categoria.length < 2) continue
    return { categoria, rest: texto.replace(m[0], ' ') }
  }
  return { categoria: null, rest: texto }
}

const STOP_LISTA_COLOR =
  /^(un|una|uno|dos|tres|marca|talle|talla|talles|precio|precios|compra|compras|venta|ventas|categor[ií]a|con|el|la|de|del|cuello|redondo|algodon|algodón|pesos|peso|unidades?)$/i

function extractListaColores(texto: string): { colores: string[]; rest: string } {
  const colores: string[] = []
  let rest = texto

  // "colores rojo azul verde" — cortar ante stock (un/dos/números), marca, talle, precio…
  const mList = rest.match(
    /colou?res?\s*[:=]?\s*(.+?)(?=\s+(?:un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|\d+|marca|talle|talla|talles|precios?|compras?|ventas?|categor|con\s+el)|\.|$)/i
  )
  if (mList) {
    const partes = mList[1]
      .split(/,| y | e |\s+/i)
      .map((c) => c.trim())
      .filter(Boolean)
      .filter((c) => !STOP_LISTA_COLOR.test(c) && !/^\d+$/.test(c) && !esTalleRopa(c))
    for (const p of partes) {
      const nombre = titleColor(singularColor(p))
      if (nombre.length > 1 && !esColorBasura(nombre)) colores.push(nombre)
    }
    rest = rest.replace(mList[0], ' ')
  }

  // Mencione sueltas: "un color verde", "color bordo"
  const reSing = /(?:un\s+)?colou?r\s+([a-záéíóúñ]+)/gi
  let sm: RegExpExecArray | null
  while ((sm = reSing.exec(texto)) !== null) {
    const nombre = titleColor(singularColor(sm[1]))
    if (
      nombre.length > 1 &&
      !esColorBasura(nombre) &&
      !STOP_LISTA_COLOR.test(nombre) &&
      !colores.some((c) => norm(c) === norm(nombre))
    ) {
      colores.push(nombre)
    }
  }

  return { colores, rest }
}

/** "talle L XL XXL" / "talles S, M, L" — solo códigos que parecen talle de ropa */
function extractTallesMencionados(texto: string): string[] {
  const talles: string[] = []
  const m = texto.match(
    /(?:talles?|talla)\s*[:=]?\s*((?:(?:XXS|XS|S|M|L|XL|XXL|XXXL|XXXXL|2XL|3XL|Único|Unico|\d{2})[\s,]*)+)/i
  )
  if (!m) return talles
  const partes = m[1].split(/[\s,]+/).filter(Boolean)
  for (const p of partes) {
    const up = normalizarTalleToken(p)
    if (esTalleRopa(up) && !talles.includes(up)) talles.push(up)
  }
  return talles
}

type CeldaRaw = { cantidad: number; color: string; talla: string }

/**
 * - Con talle: "1 rojo XS", "dos azules XXL"
 * - Solo color: "3 rojos", "2 azules" → talle Único (no comer el próximo número)
 */
function extractCeldas(
  texto: string,
  catalogoTallas: string[],
  catalogoColores: string[]
): { celdas: CeldaRaw[]; rest: string } {
  const celdas: CeldaRaw[] = []
  const work = normalizarFrasesTalle(texto.replace(/,/g, ' '))
  const tokens = work.split(/\s+/).filter(Boolean)
  const consumed = new Set<number>()

  for (let i = 0; i < tokens.length - 1; i++) {
    if (consumed.has(i)) continue

    const cantidad = parseCantidadToken(tokens[i])
    if (cantidad == null) continue

    const colorTok = limpiarToken(tokens[i + 1])
    if (!colorTok || !esPalabraColor(colorTok, catalogoColores)) continue

    const color = titleColor(singularColor(colorTok))

    // ¿Hay talle explícito después?
    let talla: string = TALLE_SOLO_COLOR
    let consumeExtra = 0

    if (i + 2 < tokens.length && !consumed.has(i + 2)) {
      const t0 = limpiarToken(tokens[i + 2])

      // "doble XL"
      if (/^(doble|triple)$/i.test(t0) && i + 3 < tokens.length) {
        const fused = normalizarTalleToken(`${t0} ${limpiarToken(tokens[i + 3])}`)
        if (esTalleToken(fused, catalogoTallas)) {
          talla = fused
          consumeExtra = 2
        }
      } else {
        const up = normalizarTalleToken(t0)
        const esTalleLetra = /^(XXS|XS|S|M|L|XL|XXL|XXXL|XXXXL|2XL|3XL|U|UNICO|ÚNICO)$/i.test(up)
        const esCalzado = /^\d+$/.test(up) && Number(up) >= 20 && Number(up) <= 60
        // Números 1–19 NUNCA son talle: son la cantidad del siguiente color ("3 rojos 2 azules")
        if (esTalleLetra) {
          talla = up
          consumeExtra = 1
        } else if (esCalzado) {
          // Ambiguo: "1 rojo 42" (talle) vs "10 verdes 20 amarillos" (20 = qty siguiente)
          const following = i + 3 < tokens.length ? limpiarToken(tokens[i + 3]) : ''
          if (following && esPalabraColor(following, catalogoColores)) {
            // dejar el número para la próxima celda
          } else {
            talla = up
            consumeExtra = 1
          }
        } else if (!/^\d+$/.test(up) && parseCantidadToken(t0) == null && esTalleToken(t0, catalogoTallas)) {
          talla = up
          consumeExtra = 1
        }
      }
    }

    celdas.push({ cantidad, color, talla })
    consumed.add(i)
    consumed.add(i + 1)
    for (let k = 0; k < consumeExtra; k++) consumed.add(i + 2 + k)
  }

  // Fusionar mismo color+talle (sumar): "1 verde" + "10 verdes"
  const merged = new Map<string, CeldaRaw>()
  for (const c of celdas) {
    const key = `${norm(c.color)}|${c.talla.toUpperCase()}`
    const prev = merged.get(key)
    if (prev) prev.cantidad += c.cantidad
    else merged.set(key, { ...c })
  }

  const restTokens = tokens.filter((_, idx) => !consumed.has(idx))
  return { celdas: Array.from(merged.values()), rest: restTokens.join(' ') }
}

/**
 * Narrativo: "azul en talle L 5 en talle XL 10" / "color verde en talle L 2 unidades"
 */
function extractCeldasNarrativo(
  texto: string,
  catalogoTallas: string[],
  catalogoColores: string[]
): CeldaRaw[] {
  const celdas: CeldaRaw[] = []
  let work = normalizarFrasesTalle(texto.replace(/\s+/g, ' '))
  // Normalizar "talle L: 5" / "talle L 5"
  work = work.replace(/\b(?:en\s+)?talles?\s+/gi, 'talle ')

  let colorActual: string | null = null
  const tokens = work.split(/\s+/).filter(Boolean)

  for (let i = 0; i < tokens.length; i++) {
    const tok = limpiarToken(tokens[i])

    // "color verde" o palabra color conocida
    if (/^colou?r$/i.test(tok) && i + 1 < tokens.length) {
      const next = limpiarToken(tokens[i + 1])
      if (esPalabraColor(next, catalogoColores)) {
        colorActual = titleColor(singularColor(next))
        i++
        continue
      }
    }
    if (esPalabraColor(tok, catalogoColores) && !/^talle$/i.test(tok)) {
      // "azul en talle…"
      if (i + 1 < tokens.length && /^(en|talle)$/i.test(limpiarToken(tokens[i + 1]))) {
        colorActual = titleColor(singularColor(tok))
        continue
      }
    }

    // "talle L 5" / "talle XL 10"
    if (/^talle$/i.test(tok) && i + 2 < tokens.length && colorActual) {
      const tallaTok = limpiarToken(tokens[i + 1])
      const qtyTok = limpiarToken(tokens[i + 2])
      if (esTalleToken(tallaTok, catalogoTallas)) {
        const qty = parseCantidadToken(qtyTok)
        if (qty != null) {
          celdas.push({
            cantidad: qty,
            color: colorActual,
            talla: normalizarTalleToken(tallaTok),
          })
          i += 2
          continue
        }
      }
    }
  }

  // merge
  const merged = new Map<string, CeldaRaw>()
  for (const c of celdas) {
    const key = `${norm(c.color)}|${c.talla.toUpperCase()}`
    const prev = merged.get(key)
    if (prev) prev.cantidad += c.cantidad
    else merged.set(key, { ...c })
  }
  return Array.from(merged.values())
}

/**
 * Parser determinístico ES → CargaExpressDraft (ropa, dictado + pegado).
 */
export function parsearCargaExpress(texto: string, catalogo?: CatalogoParse): ParseResult {
  const warnings: ParseWarning[] = []
  const draft = draftVacio()
  draft.generarBarras = true

  if (!texto?.trim()) {
    warnings.push({ code: 'sin_nombre', message: 'Texto vacío', blocking: true })
    return { draft, warnings, confidence: 'low' }
  }

  let rest = texto.replace(/\s+/g, ' ').trim()

  {
    const q = extractQuotedName(rest)
    if (q.nombre) {
      draft.nombre = q.nombre
      rest = q.rest
    }
  }

  if (!draft.nombre) {
    const k = extractNombreKeyword(rest)
    if (k.nombre) {
      draft.nombre = k.nombre
      rest = k.rest
    }
  }

  if (!draft.nombre) {
    const libre = extractNombreLibre(rest)
    if (libre.nombre) {
      draft.nombre = libre.nombre
      // No vaciar rest: color/talle/precio siguen en el texto completo
    }
  }

  {
    const c = extractPrecio(rest, 'compra')
    if (c.valor != null) {
      draft.precioCompra = c.valor
      rest = c.rest
    }
  }
  {
    const v = extractPrecio(rest, 'venta')
    if (v.valor != null) {
      draft.precioVenta = v.valor
      rest = v.rest
    }
  }
  if (!(draft.precioVenta > 0)) {
    const g = extractPrecioGenerico(rest)
    if (g.valor != null) {
      draft.precioVenta = g.valor
      if (!(draft.precioCompra > 0)) draft.precioCompra = g.valor
      rest = g.rest
    }
  }

  {
    const cat = extractCategoria(rest)
    if (cat.categoria) {
      const matched = catalogo ? matchCatalogoNombre(cat.categoria, catalogo.categorias) : null
      draft.categoriaNombre = matched ?? titleColor(cat.categoria)
      rest = cat.rest
    }
  }

  const listaColores = extractListaColores(rest)
  rest = listaColores.rest
  const coloresEje = new Map<string, string>()
  for (const c of listaColores.colores) {
    if (STOP_COLORES.test(c) || STOP_LISTA_COLOR.test(c)) continue
    coloresEje.set(norm(c), c)
  }

  // Talles mencionados sin stock se agregan más abajo si no hay celdas

  const catalogoTallaNombres = (catalogo?.tallas ?? []).map((t) => t.nombre)
  const catalogoColorNombres = (catalogo?.colores ?? []).map((c) => c.nombre)
  const { celdas: celdasRaw } = extractCeldas(rest, catalogoTallaNombres, catalogoColorNombres)

  const tallasEje = new Set<string>()
  const celdasDraft: CargaExpressDraft['celdas'] = []

  for (const cel of celdasRaw) {
    const colorMatched = catalogo
      ? matchCatalogoNombre(cel.color, catalogo.colores) ??
        matchCatalogoNombre(singularColor(cel.color), catalogo.colores)
      : null
    const colorNombre = colorMatched ?? cel.color
    if (!colorMatched && catalogo) {
      warnings.push({
        code: 'color_nuevo',
        message: `Color “${colorNombre}” no está en el catálogo — se creará al interpretar`,
      })
    }
    coloresEje.set(norm(colorNombre), colorNombre)

    const tallaMatched = catalogo
      ? catalogo.tallas.find((t) => t.nombre.toUpperCase() === cel.talla.toUpperCase())?.nombre
      : null
    const tallaNombre = tallaMatched ?? cel.talla
    if (!tallaMatched) {
      warnings.push({
        code: 'talle_nuevo',
        message: `Talle “${tallaNombre}” no está en el catálogo — se creará al interpretar`,
      })
    }
    tallasEje.add(tallaNombre)

    celdasDraft.push({
      colorNombre,
      tallaNombre,
      cantidad: cel.cantidad,
    })
  }

  draft.colores = Array.from(coloresEje.values()).map((nombre) => ({ nombre, hex: null }))
  // Si no hubo celdas, igual exponer talles mencionados en el texto
  if (tallasEje.size === 0) {
    for (const t of extractTallesMencionados(texto)) tallasEje.add(t)
  }
  draft.tallas = Array.from(tallasEje)
  draft.celdas = celdasDraft

  if (!draft.nombre?.trim()) {
    const m = texto.match(/^(.+?)(?=\s+colores?\b)/i)
    if (m) {
      draft.nombre = titleNombreProducto(
        m[1]
          .replace(/^(crear\s+)?producto\s*(con\s+(el\s+)?nombre\s*)?/i, '')
          .replace(/^["']|["']$/g, '')
          .trim()
      )
    }
  }

  // Limpiar basura residual en nombre
  if (draft.nombre) {
    draft.nombre = draft.nombre
      .replace(/^(con\s+(el\s+)?)?nombre\s+/i, '')
      .replace(/^crear\s+producto\s+/i, '')
      .replace(/[.,;:]+$/g, '')
      .trim()
    draft.nombre = titleNombreProducto(draft.nombre)
  }

  if (!draft.nombre?.trim()) {
    warnings.push({ code: 'sin_nombre', message: 'No se pudo detectar el nombre del producto', blocking: true })
  }
  if (!(draft.precioVenta > 0)) {
    warnings.push({
      code: 'sin_precio_venta',
      message: 'Falta el precio de venta',
      blocking: true,
    })
  }
  if (draft.celdas.length === 0) {
    warnings.push({
      code: 'sin_celdas',
      message: 'Faltan cantidades por talle (ej. “un rojo XS, dos azules M”)',
      blocking: true,
    })
  }

  const blocking = warnings.some((w) => w.blocking)
  let confidence: ParseResult['confidence'] = 'high'
  if (blocking) confidence = 'low'
  else if (warnings.length > 0) confidence = 'medium'

  return { draft, warnings, confidence }
}

/**
 * Paso 1: solo nombre, precios, categoría, colores y talles mencionados (sin stock).
 */
export function parsearDatosProducto(texto: string, catalogo?: CatalogoParse): ParseResult {
  const full = parsearCargaExpress(texto, catalogo)
  const tallesMencionados = extractTallesMencionados(texto)
  const draft = {
    ...full.draft,
    celdas: [] as CargaExpressDraft['celdas'],
    tallas: tallesMencionados.length > 0 ? tallesMencionados : full.draft.tallas,
  }
  // Mantener colores del listado; si no hubo "colores X Y", intentar sacar colores de celdas parseadas
  if (draft.colores.length === 0 && full.draft.celdas.length > 0) {
    const map = new Map<string, string>()
    for (const c of full.draft.celdas) {
      map.set(norm(c.colorNombre), c.colorNombre)
    }
    draft.colores = Array.from(map.values()).map((nombre) => ({ nombre, hex: null }))
  }

  const warnings = full.warnings.filter((w) => w.code !== 'sin_celdas')
  if (!draft.nombre?.trim()) {
    if (!warnings.some((w) => w.code === 'sin_nombre')) {
      warnings.push({ code: 'sin_nombre', message: 'No se pudo detectar el nombre', blocking: true })
    }
  }
  if (draft.colores.length === 0) {
    warnings.push({
      code: 'otro',
      message: 'No se detectaron colores. Decí p.ej. “color azul” o “colores rojo, verde”',
      blocking: true,
    })
  }
  if (draft.categoriaNombre) {
    const existe = catalogo?.categorias.some(
      (c) => norm(c.nombre) === norm(draft.categoriaNombre!)
    )
    if (!existe) {
      warnings.push({
        code: 'otro',
        message: `Categoría “${draft.categoriaNombre}” no existe — se creará al interpretar`,
      })
    }
  }
  for (const col of draft.colores) {
    const existe = catalogo?.colores.some((c) => norm(c.nombre) === norm(col.nombre))
    if (catalogo && !existe) {
      warnings.push({
        code: 'color_nuevo',
        message: `Color “${col.nombre}” no existe — se creará al interpretar`,
      })
    }
  }
  for (const t of draft.tallas) {
    if (!esTalleRopa(t)) {
      warnings.push({
        code: 'talle_nuevo',
        message: `“${t}” no parece un talle válido — se omite (usá XS, S, M, L, XL…)`,
      })
    } else {
      const existe = catalogo?.tallas.some((x) => x.nombre.toUpperCase() === t.toUpperCase())
      if (catalogo && !existe) {
        warnings.push({
          code: 'talle_nuevo',
          message: `Talle “${t}” no existe — se creará al interpretar`,
        })
      }
    }
  }
  // Filtrar talles inválidos
  draft.tallas = draft.tallas.filter((t) => esTalleRopa(t))

  const blocking = warnings.some((w) => w.blocking)
  return {
    draft,
    warnings,
    confidence: blocking ? 'low' : warnings.length ? 'medium' : 'high',
  }
}

/**
 * Paso 2: solo stock (cantidad + color + talle). Los colores ya elegidos guían el match.
 */
export function parsearStockCeldas(
  texto: string,
  coloresElegidos: string[],
  catalogo?: CatalogoParse
): ParseResult {
  const warnings: ParseWarning[] = []
  const draft = draftVacio()
  draft.generarBarras = true
  draft.colores = coloresElegidos.map((nombre) => ({ nombre, hex: null }))

  if (!texto?.trim()) {
    warnings.push({ code: 'sin_celdas', message: 'Texto de stock vacío', blocking: true })
    return { draft, warnings, confidence: 'low' }
  }

  const catalogoTallas = (catalogo?.tallas ?? []).map((t) => t.nombre)
  // Priorizar colores ya elegidos + catálogo
  const catalogoColores = [
    ...coloresElegidos,
    ...(catalogo?.colores ?? []).map((c) => c.nombre),
  ]

  const { celdas: celdasRaw } = extractCeldas(
    texto.replace(/\s+/g, ' ').trim(),
    catalogoTallas,
    catalogoColores
  )
  const narrativo = extractCeldasNarrativo(
    texto.replace(/\s+/g, ' ').trim(),
    catalogoTallas,
    catalogoColores
  )
  // Preferir narrativo si trajo más celdas (frases tipo "azul en talle L 5")
  const celdasFuente = narrativo.length >= celdasRaw.length && narrativo.length > 0 ? narrativo : celdasRaw

  const tallasEje = new Set<string>()
  const celdasDraft: CargaExpressDraft['celdas'] = []
  const elegidosNorm = new Set(coloresElegidos.map((c) => norm(c)))

  for (const cel of celdasFuente) {
    if (!esTalleRopa(cel.talla) && cel.talla.toUpperCase() !== 'ÚNICO' && cel.talla.toUpperCase() !== 'UNICO') {
      warnings.push({
        code: 'talle_nuevo',
        message: `“${cel.talla}” no parece un talle válido — se omite`,
      })
      continue
    }

    const colorMatched =
      coloresElegidos.find((c) => norm(c) === norm(cel.color) || norm(c) === singularColor(cel.color)) ??
      (catalogo
        ? matchCatalogoNombre(cel.color, catalogo.colores) ??
          matchCatalogoNombre(singularColor(cel.color), catalogo.colores)
        : null) ??
      cel.color

    const colorNormOk =
      elegidosNorm.size === 0 ||
      elegidosNorm.has(norm(colorMatched)) ||
      elegidosNorm.has(singularColor(colorMatched))

    if (!colorNormOk) {
      // Color nuevo en stock → lo aceptamos y se creará
      warnings.push({
        code: 'color_nuevo',
        message: `Color “${colorMatched}” no estaba en el paso 1 — se agregará y creará`,
      })
    }

    const tallaMatched = catalogo
      ? catalogo.tallas.find((t) => t.nombre.toUpperCase() === cel.talla.toUpperCase())?.nombre
      : null
    const tallaNombre = tallaMatched ?? cel.talla
    if (!tallaMatched) {
      warnings.push({
        code: 'talle_nuevo',
        message: `Talle “${tallaNombre}” no existe — se creará al interpretar`,
      })
    }
    tallasEje.add(tallaNombre)
    celdasDraft.push({
      colorNombre: colorMatched,
      tallaNombre,
      cantidad: cel.cantidad,
    })
  }

  draft.tallas = Array.from(tallasEje)
  draft.celdas = celdasDraft
  // Incluir colores nuevos detectados en stock
  for (const c of celdasDraft) {
    if (!draft.colores.some((x) => norm(x.nombre) === norm(c.colorNombre))) {
      draft.colores.push({ nombre: c.colorNombre, hex: null })
    }
  }

  if (celdasDraft.length === 0) {
    warnings.push({
      code: 'sin_celdas',
      message: 'No se detectó stock. Ej: “1 rojo XS, 2 azules M, 3 verdes XL”',
      blocking: true,
    })
  }

  const blocking = warnings.some((w) => w.blocking)
  return {
    draft,
    warnings,
    confidence: blocking ? 'low' : warnings.length ? 'medium' : 'high',
  }
}
