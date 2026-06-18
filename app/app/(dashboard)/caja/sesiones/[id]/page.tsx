import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obtenerSesionResumen, nombreUsuario } from '@/lib/caja/queries'
import { CierreDetalle } from '@/components/caja/CierreDetalle'
import { ReopenCajaButton } from '@/components/caja/ReopenCajaButton'

import { formatDateTime } from '@/lib/format'

interface Props {
  params: Promise<{ id: string }>
}

export default async function SesionDetallePage({ params }: Props) {
  const { id } = await params
  const sesion = await obtenerSesionResumen(id)
  if (!sesion) notFound()

  const usuario = nombreUsuario(sesion.usuario_apertura)

  return (
    <div className="space-y-6 max-w-3xl">
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

      <div>
        <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Detalle de sesión</h1>
        <p className="text-[13px] text-gray-400 mt-1">
          Apertura: {formatDateTime(sesion.fecha_apertura)}
          {usuario ? ` · ${usuario}` : ''}
        </p>
      </div>

      {sesion.cierre ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-[#0A0A0A]">Cierre</h2>
            <ReopenCajaButton sesionId={sesion.id} />
          </div>
          <CierreDetalle cierre={sesion.cierre} />
        </div>
      ) : (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center text-sm text-gray-500">
          Esta sesión no tiene cierre registrado.
        </div>
      )}
    </div>
  )
}
