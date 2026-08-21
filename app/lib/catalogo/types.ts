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

export interface ProductoCatalogoPublico {
  id: string
  nombre: string
  descripcion: string | null
  precio_venta: number
  imagen_url: string | null
  variantes: VarianteCatalogoPublica[]
  tramos: TramoCantidad[]
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
  items: Array<{ variante_id: string; cantidad: number }>
}
