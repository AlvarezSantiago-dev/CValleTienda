import Link from 'next/link'
import { AbrirSesionForm } from '@/components/caja/AbrirSesionForm'
import { CierreDetalle } from '@/components/caja/CierreDetalle'
import type { Cierre } from '@/lib/caja/queries'

interface Props {
  ultimoCierre: Cierre | null
  ultimaSesionId: string | null
  mostrarLinkDetalle: boolean
}

export function CajaEmptyState({
  ultimoCierre,
  ultimaSesionId,
  mostrarLinkDetalle,
}: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      <div className="space-y-3">
        <div>
          <h2 className="text-[15px] font-semibold text-fg">No hay caja abierta</h2>
          <p className="text-sm text-fg-muted mt-1">
            Abrí un turno para poder vender en el POS y registrar movimientos.
          </p>
        </div>
        <AbrirSesionForm />
      </div>

      {ultimoCierre && ultimaSesionId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h2 className="text-sm font-semibold text-fg">Último cierre</h2>
            {mostrarLinkDetalle && (
              <Link
                href={`/caja/sesiones/${ultimaSesionId}`}
                className="text-xs font-medium text-fg-brand hover:underline transition-colors min-h-11 inline-flex items-center"
              >
                Ver detalle completo →
              </Link>
            )}
          </div>
          <CierreDetalle cierre={ultimoCierre} />
        </div>
      )}
    </div>
  )
}
