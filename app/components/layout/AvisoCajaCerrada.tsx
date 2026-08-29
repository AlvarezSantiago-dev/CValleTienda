import Link from 'next/link'
import { existeSesionCajaAbierta } from '@/lib/caja/queries'
import { AvisoCajaCerradaRouteGuard } from '@/components/layout/AvisoCajaCerradaRouteGuard'

/**
 * Banner en el layout cuando NO hay sesión de caja abierta.
 * Oculto en /dashboard y /caja (tienen banner propio).
 */
export async function AvisoCajaCerrada() {
  let abierta = false
  try {
    abierta = await existeSesionCajaAbierta()
  } catch {
    return null
  }
  if (abierta) return null

  return (
    <AvisoCajaCerradaRouteGuard>
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 text-sm text-amber-900">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-amber-900 font-semibold">
            !
          </span>
          <span>
            <strong>Caja cerrada.</strong> No vas a poder registrar ventas hasta abrirla.
          </span>
        </div>
        <Link
          href="/caja"
          className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium"
        >
          Abrir caja
        </Link>
      </div>
    </div>
    </AvisoCajaCerradaRouteGuard>
  )
}
