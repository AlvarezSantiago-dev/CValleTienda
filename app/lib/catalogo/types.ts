import type { TipoEntregaCatalogo } from '@/types/database'
import type { TramoCantidad } from '@/lib/precios/tramos-cantidad'

export interface TiendaCatalogoPublica {
  slug: string
  nombre: string
  logo_url: string | null
  direccion: string | null
  ciudad: string | null
  catalogo_retiro: boolean
  catalogo_envio: boolean
  catalogo_mensaje_bienvenida: string | null
  usarPedidoCc: boolean
  recargoCcDefault: number
}

export interface VarianteCatalogoPublica {
  id: string
  precio_venta: number
  stock_actual: number
  talla: string | null
  color: string | null
  imagen_url: string | null
  vendible: boolean
}

export interface PackCatalogoPublico {
  id: string
  unidades: number
  precio: number
  nombre: string | null
  imagen_url: string | null
  recargo_cc_pct: number | null
  tramos: TramoCantidad[]
}

export interface ProductoCatalogoPublico {
  id: string
  nombre: string
  descripcion: string | null
  precio_venta: number
  recargo_cc_pct: number | null
  imagen_url: string | null
  categoria_id: string | null
  categoria_nombre: string | null
  variantes: VarianteCatalogoPublica[]
  tramos: TramoCantidad[]
  packs: PackCatalogoPublico[]
}

/** Slide liviano para coverflow (sin packs/tramos). */
export interface ProductoDestacadoCatalogo {
  id: string
  nombre: string
  imagen_url: string | null
  precio_desde: number
  hay_desde: boolean
}

export interface CategoriaCatalogoPublica {
  id: string
  nombre: string
}

export interface CartItem {
  varianteId: string
  productoId: string
  nombre: string
  talla: string | null
  color: string | null
  qty: number
  precio: number
  precioLista?: number
  tramos?: TramoCantidad[]
  imagen: string | null
  packId?: string | null
  packUnidades?: number | null
  packLabel?: string | null
  /** Recargo % de pack o producto. null = default de tienda. */
  recargo_cc_pct?: number | null
  /** Snapshot del stock físico de la variante al agregar. */
  stockActual?: number | null
}

export interface PedidoEnviadoPayload {
  slug: string
  numero: number
  waUrl: string
  opened?: boolean
}

export type FiltroPedidos = 'activos' | 'nuevos' | 'en_curso' | 'convertidos' | 'cancelados' | 'todos'

export interface CheckoutInput {
  cliente_nombre: string
  cliente_telefono: string
  tipo_entrega: TipoEntregaCatalogo
  direccion_entrega?: string
  notas?: string
  website?: string
  condicion_pago?: 'contado' | 'cuenta_corriente'
  items: Array<{ variante_id: string; cantidad: number; pack_id?: string | null }>
}
