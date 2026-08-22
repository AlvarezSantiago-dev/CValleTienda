import type { TramoCantidad } from '@/lib/precios/tramos-cantidad'

export const MAX_PACKS = 8

export interface ProductoPackInput {
  id?: string
  unidades: number
  precio: number
  codigo_barras?: string | null
  imagen_url?: string | null
  nombre?: string | null
  orden?: number
  recargo_cc_pct?: number | null
  tramos: TramoCantidad[]
}

export interface ProductoPack {
  id: string
  producto_id: string
  unidades: number
  precio: number
  codigo_barras: string | null
  imagen_url: string | null
  nombre: string | null
  orden: number
  recargo_cc_pct: number | null
  tramos: TramoCantidad[]
}
