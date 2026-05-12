import Link from 'next/link'
import { obtenerSesionAbierta } from '@/lib/caja/queries'

/**
 * Banner que se muestra arriba del contenido del dashboard cuando NO hay
 * sesión de caja abierta. Permite al usuario ir directamente a /caja para abrirla.
 *
 * Es un Server Component: se renderiza en cada navegación del layout.
 */
export async function AvisoCajaCerrada() {
  let sesion = null
  try {
    sesion = await obtenerSesionAbierta()
  } catch {
    // Si falla la consulta (p.ej. tabla aún no creada), no mostrar banner
    return null
  }
  if (sesion) return null

  return (
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
  )
}
