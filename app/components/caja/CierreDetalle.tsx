import type { Cierre } from '@/lib/caja/queries'
import type { ResumenTurno, TopProductoTurno, VentaTurnoItem } from '@/lib/caja/types'
import { cierreToResumenTurno } from '@/lib/caja/resumen-turno'
import { ResumenTurnoPanel } from '@/components/caja/ResumenTurnoPanel'
import { VentasTurnoLista } from '@/components/caja/VentasTurnoLista'
import { TopProductosTurno } from '@/components/caja/TopProductosTurno'
import { formatDateTime } from '@/lib/format'

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
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
      <div className="px-6 py-5 border-b border-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
            Cerrado
          </span>
          {cierre.tipo_cierre === 'emergencia' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">
              ⚠️ Emergencia
            </span>
          )}
        </div>
        <h2 className="text-[15px] font-semibold text-gray-900">
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
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <span className="text-xs font-medium text-gray-500">Observaciones:</span>{' '}
            {cierre.observaciones}
          </div>
        )}
      </div>
    </div>
  )
}
