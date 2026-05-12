import type { JobImpresion } from '@/lib/impresion/types'
import type {
  PayloadTicketVenta,
  PayloadTicketDevolucion,
  PayloadCierreCaja,
  PayloadEtiquetaProducto,
} from '@/lib/impresion/types'
import { TicketVentaRenderer } from './TicketVentaRenderer'
import { TicketDevolucionRenderer } from './TicketDevolucionRenderer'
import { CierreCajaRenderer } from './CierreCajaRenderer'
import { HojaEtiquetas } from './HojaEtiquetas'

interface Props {
  job: JobImpresion
}

/**
 * Despacha al renderer correcto según el tipo de job.
 * Acepta el payload "anyo" del job (DB jsonb) y lo trata como el tipo correcto.
 */
export function JobRenderer({ job }: Props) {
  switch (job.tipo) {
    case 'ticket_venta':
      return <TicketVentaRenderer payload={job.payload as PayloadTicketVenta} />
    case 'ticket_devolucion':
      return <TicketDevolucionRenderer payload={job.payload as PayloadTicketDevolucion} />
    case 'cierre_caja':
      return <CierreCajaRenderer payload={job.payload as PayloadCierreCaja} />
    case 'etiqueta_producto':
      return <HojaEtiquetas payload={job.payload as PayloadEtiquetaProducto} />
    default: {
      const _exhaustive: never = job.tipo
      return <div>Tipo de job desconocido: {String(_exhaustive)}</div>
    }
  }
}
