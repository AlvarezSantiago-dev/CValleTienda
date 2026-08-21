/** PrintBridge v3.1.x descarta el logo si el archivo baja >512 KB. */
export const LOGO_MAX_BYTES_PRINTBRIDGE = 512 * 1024
export const LOGO_TARGET_BYTES = 400 * 1024
export const LOGO_MAX_LADO_PX = 800
export const LOGO_MAX_BYTES_ORIGEN = 8 * 1024 * 1024

const TIPOS_RASTER = ['image/jpeg', 'image/png', 'image/webp'] as const

function esRaster(type: string): boolean {
  return (TIPOS_RASTER as readonly string[]).includes(type)
}

async function cargarImagen(file: File): Promise<{ img: HTMLImageElement; url: string }> {
  const url = URL.createObjectURL(file)
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    el.src = url
  })
  return { img, url }
}

function blobJpeg(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('No se pudo comprimir el logo'))),
      'image/jpeg',
      quality
    )
  })
}

/**
 * Deja el logo listo para térmica (PrintBridge ≤512 KB) y remito A4.
 * Fondo blanco: la impresora no maneja transparencia.
 */
export async function redimensionarLogoNegocio(file: File): Promise<File> {
  if (file.size > LOGO_MAX_BYTES_ORIGEN) {
    throw new Error('El logo no puede superar 8 MB.')
  }

  const esSvg =
    file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)
  if (!esRaster(file.type) && !esSvg) {
    throw new Error('Formato no permitido. Usá PNG, JPG, WEBP o SVG.')
  }

  if (!esSvg && file.size <= LOGO_TARGET_BYTES) {
    return file
  }

  const { img, url } = await cargarImagen(file)
  try {
    const w = img.naturalWidth || img.width
    const h = img.naturalHeight || img.height
    if (!w || !h) throw new Error('No se pudo leer la imagen')

    const lado = Math.max(w, h)
    const scale = lado > LOGO_MAX_LADO_PX ? LOGO_MAX_LADO_PX / lado : 1
    const tw = Math.max(1, Math.round(w * scale))
    const th = Math.max(1, Math.round(h * scale))

    const canvas = document.createElement('canvas')
    canvas.width = tw
    canvas.height = th
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No se pudo procesar el logo')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, tw, th)
    ctx.drawImage(img, 0, 0, tw, th)

    let quality = 0.85
    let blob = await blobJpeg(canvas, quality)
    while (blob.size > LOGO_TARGET_BYTES && quality > 0.5) {
      quality -= 0.1
      blob = await blobJpeg(canvas, quality)
    }

    if (blob.size > LOGO_MAX_BYTES_PRINTBRIDGE) {
      throw new Error(
        'El logo sigue demasiado pesado para el ticket. Probá un PNG o JPG más simple.'
      )
    }

    return new File([blob], 'logo.jpg', { type: 'image/jpeg' })
  } finally {
    URL.revokeObjectURL(url)
  }
}
