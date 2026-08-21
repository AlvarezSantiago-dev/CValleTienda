const RESERVED = new Set([
  'c',
  'api',
  'login',
  'registro',
  'presentacion',
  'superadmin',
  'admin',
  'www',
  'catalogo',
  'pedidos',
  'pos',
  'app',
  'cvalle',
  'cvalletienda',
  'setup',
  'auth',
  'terminos',
  'privacidad',
])

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function slugifyNombre(nombre: string): string {
  const raw = nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
  let slug = raw.slice(0, 48).replace(/-+$/g, '')
  if (slug.length < 3) slug = (slug + '-tienda').slice(0, 48)
  if (RESERVED.has(slug)) slug = `${slug}-tienda`.slice(0, 48)
  return slug
}

export function validarSlug(slug: string): string | null {
  const s = slug.trim().toLowerCase()
  if (s.length < 3 || s.length > 48) return 'El link debe tener entre 3 y 48 caracteres'
  if (!SLUG_RE.test(s)) return 'Usá solo letras minúsculas, números y guiones'
  if (RESERVED.has(s)) return 'Ese nombre de link no está disponible'
  return null
}

export function siguienteSlugDisponible(base: string, ocupados: Set<string>): string {
  let candidate = base
  let n = 2
  while (ocupados.has(candidate) || RESERVED.has(candidate) || validarSlug(candidate)) {
    const suffix = `-${n}`
    candidate = `${base.slice(0, 48 - suffix.length)}${suffix}`
    n += 1
    if (n > 99) break
  }
  return candidate
}
