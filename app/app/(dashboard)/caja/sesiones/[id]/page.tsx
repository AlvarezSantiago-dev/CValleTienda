import Link from 'next/link'
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
      <div className="flex items-center gap-3">
        <Link
          href="/caja"
          className="text-sm text-lime-700 hover:text-lime-800 hover:underline"
        >
          ← Caja
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-gray-700">Sesión</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Detalle de sesión</h1>
          <div className="text-[13px] text-gray-500 mt-2 space-y-0.5">
            <p>
              <span className="text-gray-400">Apertura:</span> {formatDateTime(sesion.fecha_apertura)}
              {usuario ? ` · ${usuario}` : ''}
            </p>
            {sesion.fecha_cierre && (
              <p>
                <span className="text-gray-400">Cierre:</span> {formatDateTime(sesion.fecha_cierre)}
              </p>
            )}
            <p>
              <span className="text-gray-400">Estado:</span>{' '}
              {sesion.estado === 'abierta' ? (
                <span className="text-lime-700 font-medium">Abierta</span>
              ) : (
                <span className="text-gray-700 font-medium">Cerrada</span>
              )}
            </p>
          </div>
        </div>
        {sesion.cierre && (
          <div className="flex items-center gap-2 flex-wrap">
            <ImprimirCierreButton sesionId={sesion.id} cierreId={sesion.cierre.id} />
            <ReopenCajaButton sesionId={sesion.id} />
          </div>
        )}
      </div>

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
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500">
          Esta sesión no tiene cierre registrado.
        </div>
      )}
    </div>
  )
}
