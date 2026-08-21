export const BUCKET_PRODUCTOS = 'productos'

export const TIPOS_IMAGEN_PRODUCTO = ['image/jpeg', 'image/png', 'image/webp'] as const
export type TipoImagenProducto = (typeof TIPOS_IMAGEN_PRODUCTO)[number]

/** Límite de la foto que elige el usuario (cámara / galería). */
export const MAX_BYTES_ANTES_RESIZE = 8 * 1024 * 1024

/** Lado largo máximo guardado. 1200 px alcanza para ficha, POS y catálogo. */
export const MAX_LADO_PX = 1200

/** Calidad JPEG de partida; si el archivo sigue grande, baja sola. */
export const JPEG_QUALITY = 0.78

/** Objetivo típico en Storage (~una foto de producto). */
export const TARGET_BYTES = 280 * 1024

/** Tope duro en el servidor. Nadie guarda más que esto. */
export const MAX_BYTES_UPLOAD = 400 * 1024

export const EXTS_COVER = ['jpg', 'jpeg', 'png', 'webp'] as const

export const ACCEPT_IMAGEN_PRODUCTO = 'image/jpeg,image/png,image/webp'
