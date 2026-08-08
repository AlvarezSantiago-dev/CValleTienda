import { notFound } from 'next/navigation'
import {
  obtenerSesionResumen,
  obtenerResumenTurno,
  listarVentasTurno,
  obtenerTopProductosTurno,
  listarMovimientosTurno,
  nombreUsuario,
} from '@/lib/caja/queries'
import { CierreDetalle } from '@/components/caja/CierreDetalle'
import { ReopenCajaButton } from '@/components/caja/ReopenCajaButton'
import { ImprimirCierreButton } from '@/components/caja/ImprimirCierreButton'
import { MovimientosTurnoLista } from '@/components/caja/MovimientosTurnoLista'
import { formatDateTime } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SesionDetallePage({ params }: Props) {
  const { id } = await params
  const sesion = await obtenerSesionResumen(id)
  if (!sesion) notFound()

  const usuario = nombreUsuario(sesion.usuario_apertura)

  const [resumenTurno, ventas, topProductos, movimientos] = await Promise.all([
    obtenerResumenTurno(id),
    listarVentasTurno(id, 10),
    obtenerTopProductosTurno(id, 5),
    listarMovimientosTurno(id),
  ])

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Detalle de sesión"
        breadcrumb={<Breadcrumbs />}
        description={
          [
            `Apertura: ${formatDateTime(sesion.fecha_apertura)}${usuario ? ` · ${usuario}` : ''}`,
            sesion.fecha_cierre ? `Cierre: ${formatDateTime(sesion.fecha_cierre)}` : null,
          ]
            .filter(Boolean)
            .join(' · ')
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {sesion.estado === 'abierta' ? (
              <Badge variant="brand">Abierta</Badge>
            ) : (
              <Badge variant="neutral">Cerrada</Badge>
            )}
            {sesion.cierre && (
              <>
                <ImprimirCierreButton sesionId={sesion.id} cierreId={sesion.cierre.id} />
                <ReopenCajaButton sesionId={sesion.id} />
              </>
            )}
          </div>
        }
        className="mb-0"
      />

      {sesion.cierre ? (
        <div className="space-y-6">
          <CierreDetalle
            cierre={sesion.cierre}
            resumenTurno={resumenTurno}
            ventas={ventas}
            topProductos={topProductos}
            mostrarExtras
          />
          <MovimientosTurnoLista movimientos={movimientos} />
        </div>
      ) : (
        <div className="bg-surface border border-dashed border-border-default rounded-[var(--radius-lg)] p-8 text-center text-sm text-fg-muted">
          Esta sesión no tiene cierre registrado.
        </div>
      )}
    </div>
  )
}
