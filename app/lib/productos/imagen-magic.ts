import type { TipoImagenProducto } from './imagen-const'

export function detectarImagen(
  bytes: Uint8Array,
  _declaredType?: string
): { ext: 'jpg' | 'png' | 'webp'; contentType: TipoImagenProducto } | null {
  const isJpeg =
    bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const isPng =
    bytes.length >= 4 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  const isWebp =
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50

  if (isJpeg) return { ext: 'jpg', contentType: 'image/jpeg' }
  if (isPng) return { ext: 'png', contentType: 'image/png' }
  if (isWebp) return { ext: 'webp', contentType: 'image/webp' }
  return null
}
