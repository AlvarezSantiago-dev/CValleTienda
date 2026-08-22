export const PACK_ID_PREFIX = '__pack_'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function idVirtualPack(varianteId: string, packId: string): string {
  return `${varianteId}${PACK_ID_PREFIX}${packId}`
}

export function parseIdVirtualPack(
  id: string
): { varianteId: string; packId: string } | null {
  const i = id.indexOf(PACK_ID_PREFIX)
  if (i <= 0) return null
  const varianteId = id.slice(0, i)
  const packId = id.slice(i + PACK_ID_PREFIX.length)
  if (!packId || packId === 'auto' || !UUID_RE.test(packId)) return null
  return { varianteId, packId }
}

/** Variante física detrás de una entrada POS (unidad, pack legado o pack N). */
export function varianteIdDeEntrada(id: string): string {
  const parsed = parseIdVirtualPack(id)
  if (parsed) return parsed.varianteId
  return id.replace(/__pack(_auto)?$/, '')
}

export function labelPack(unidades: number, nombre?: string | null): string {
  const n = nombre?.trim()
  if (n) return n
  const u = Number(unidades)
  if (!Number.isFinite(u) || u <= 1) return 'Pack'
  return `Pack x${u}`
}
