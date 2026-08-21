import {
  JPEG_QUALITY,
  MAX_BYTES_ANTES_RESIZE,
  MAX_BYTES_UPLOAD,
  MAX_LADO_PX,
  TARGET_BYTES,
  TIPOS_IMAGEN_PRODUCTO,
} from './imagen-const'

function tipoPermitido(type: string): boolean {
  return (TIPOS_IMAGEN_PRODUCTO as readonly string[]).includes(type)
}

async function blobDesdeFile(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file)
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = url
  })
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('No se pudo comprimir la imagen'))),
      'image/jpeg',
      quality
    )
  })
}

/**
 * Siempre re-encoda a JPEG (salvo que ya sea un JPEG/WEBP chico).
 * Baja calidad hasta TARGET_BYTES. El servidor rechaza > MAX_BYTES_UPLOAD.
 */
export async function redimensionarImagenProducto(file: File): Promise<File> {
  if (file.size > MAX_BYTES_ANTES_RESIZE) {
    throw new Error('La foto no puede superar 8 MB.')
  }
  if (!tipoPermitido(file.type)) {
    throw new Error('Formato no permitido. Usá JPG, PNG o WEBP.')
  }

  const img = await blobDesdeFile(file)
  try {
    const w = img.width
    const h = img.height
    const ladoLargo = Math.max(w, h)
    const yaChica =
      ladoLargo <= MAX_LADO_PX &&
      file.size <= TARGET_BYTES &&
      (file.type === 'image/jpeg' || file.type === 'image/webp')
    if (yaChica) {
      return file
    }

    const scale = ladoLargo > MAX_LADO_PX ? MAX_LADO_PX / ladoLargo : 1
    const tw = Math.max(1, Math.round(w * scale))
    const th = Math.max(1, Math.round(h * scale))
    const canvas = document.createElement('canvas')
    canvas.width = tw
    canvas.height = th
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No se pudo procesar la imagen')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, tw, th)
    ctx.drawImage(img, 0, 0, tw, th)

    let quality = JPEG_QUALITY
    let blob = await toJpeg(canvas, quality)
    while (blob.size > TARGET_BYTES && quality > 0.5) {
      quality -= 0.08
      blob = await toJpeg(canvas, quality)
    }

    if (blob.size > MAX_BYTES_UPLOAD) {
      throw new Error(
        'La foto sigue pesada después de comprimir. Probá recortarla o usar otra más simple.'
      )
    }

    return new File([blob], 'cover.jpg', { type: 'image/jpeg' })
  } finally {
    if ('close' in img && typeof img.close === 'function') img.close()
  }
}
