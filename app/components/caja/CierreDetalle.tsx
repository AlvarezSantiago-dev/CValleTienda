import { AlertTriangle } from 'lucide-react'
import type { Cierre } from '@/lib/caja/queries'
import type { ResumenTurno, TopProductoTurno, VentaTurnoItem } from '@/lib/caja/types'
import { cierreToResumenTurno } from '@/lib/caja/resumen-turno'
import { ResumenTurnoPanel } from '@/components/caja/ResumenTurnoPanel'
import { VentasTurnoLista } from '@/components/caja/VentasTurnoLista'
import { TopProductosTurno } from '@/components/caja/TopProductosTurno'
import { formatDateTime } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'

interface CierreDetalleProps {
  cierre: Cierre
  resumenTurno?: ResumenTurno | null
  ventas?: VentaTurnoItem[]
  topProductos?: TopProductoTurno[]
  mostrarExtras?: boolean
}

export function CierreDetalle({
  cierre,
  resumenTurno,
  ventas,
  topProductos,
  mostrarExtras = false,
}: CierreDetalleProps) {
  const resumen = resumenTurno ?? cierreToResumenTurno(cierre)

  return (
    <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden shadow-xs">
      <div className="px-6 py-5 border-b border-border-subtle">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Badge variant="neutral">Cerrado</Badge>
          {cierre.tipo_cierre === 'emergencia' && (
            <Badge variant="warning">
              <AlertTriangle size={12} aria-hidden />
              Emergencia
            </Badge>
          )}
        </div>
        <h2 className="text-[15px] font-semibold text-fg">
          Cierre del {formatDateTime(cierre.fecha_cierre)}
        </h2>
      </div>

      <div className="px-6 py-5 space-y-6">
        <ResumenTurnoPanel resumen={resumen} modo="cerrado" cierre={cierre} />

        {mostrarExtras && ventas && <VentasTurnoLista ventas={ventas} />}
        {mostrarExtras && topProductos && topProductos.length > 0 && (
          <TopProductosTurno productos={topProductos} />
        )}

        {cierre.observaciones && (
          <div className="rounded-[var(--radius-md)] bg-surface-sunken px-3 py-2 text-sm text-fg">
            <span className="text-xs font-medium text-fg-muted">Observaciones:</span>{' '}
            {cierre.observaciones}
          </div>
        )}
      </div>
    </div>
  )
}
