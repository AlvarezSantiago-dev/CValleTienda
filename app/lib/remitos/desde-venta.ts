import type { TipoRemito } from '@/types/database'

export interface RemitoDesdeVentaItem {
  nombre_producto: string
  talla: string | null
  color: string | null
  cantidad: number
  precio_unitario: number
}

export interface RemitoDesdeVentaInput {
  montoCc: number
  total: number
  clienteNombre: string
  items: RemitoDesdeVentaItem[]
}

export function armarRemitoDesdeVenta(input: RemitoDesdeVentaInput): {
  tipo: TipoRemito
  destinatario: string
  monto_total: number
  items: RemitoDesdeVentaItem[]
} {
  return {
    tipo: input.montoCc > 0.01 ? 'cuenta_corriente' : 'entrega',
    destinatario: input.clienteNombre.trim() || 'Cliente',
    monto_total: input.total,
    items: input.items,
  }
}
