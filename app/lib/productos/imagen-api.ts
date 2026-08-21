import { redimensionarImagenProducto } from './imagen-cliente'

export type KindImagen = 'cover' | 'color' | 'variante'

export type ImagenApiResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

async function parseJsonError(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as { error?: string }
    return json.error ?? `Error ${res.status}`
  } catch {
    return `Error ${res.status}`
  }
}

export async function subirImagenProducto(
  productoId: string,
  file: File,
  opts?: { kind?: KindImagen; colorId?: string; varianteId?: string }
): Promise<ImagenApiResult> {
  try {
    const comprimido = await redimensionarImagenProducto(file)
    const fd = new FormData()
    fd.append('imagen', comprimido)
    fd.append('producto_id', productoId)
    fd.append('kind', opts?.kind ?? 'cover')
    if (opts?.colorId) fd.append('color_id', opts.colorId)
    if (opts?.varianteId) fd.append('variante_id', opts.varianteId)
    const res = await fetch('/api/productos/imagen', { method: 'POST', body: fd })
    if (!res.ok) return { ok: false, error: await parseJsonError(res) }
    const json = (await res.json()) as { url: string }
    return { ok: true, url: json.url }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Error al subir' }
  }
}

export async function eliminarImagenProducto(
  productoId: string,
  opts?: { kind?: KindImagen; colorId?: string; varianteId?: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sp = new URLSearchParams({ producto_id: productoId, kind: opts?.kind ?? 'cover' })
  if (opts?.colorId) sp.set('color_id', opts.colorId)
  if (opts?.varianteId) sp.set('variante_id', opts.varianteId)
  const res = await fetch(`/api/productos/imagen?${sp.toString()}`, { method: 'DELETE' })
  if (!res.ok) return { ok: false, error: await parseJsonError(res) }
  return { ok: true }
}

/** Tras crear el producto: tapa + fotos por color. Devuelve el primer error o null. */
export async function subirImagenesTrasAlta(
  productoId: string,
  opts: { cover?: File | null; porColor?: Record<string, File> }
): Promise<string | null> {
  if (opts.cover) {
    const r = await subirImagenProducto(productoId, opts.cover)
    if (!r.ok) return r.error
  }
  for (const [colorId, file] of Object.entries(opts.porColor ?? {})) {
    if (!colorId || !file) continue
    const r = await subirImagenProducto(productoId, file, { kind: 'color', colorId })
    if (!r.ok) return r.error
  }
  return null
}
