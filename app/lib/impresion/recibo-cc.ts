import type { TiendaPayload } from '@/lib/impresion/types'

export interface PayloadReciboCc {
  tienda: TiendaPayload
  clienteNombre: string
  fecha: string
  monto: number
  medioPago: string | null
  saldoAnterior: number
  saldoPosterior: number
  remitoNumero: number | null
  concepto: string | null
}

export function formatFechaRecibo(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
