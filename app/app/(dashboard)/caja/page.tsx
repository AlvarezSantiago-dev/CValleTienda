import Link from 'next/link'
import { obtenerSesionAbierta, listarSesiones, obtenerCierre, nombreUsuario } from '@/lib/caja/queries'
import { AbrirSesionForm } from '@/components/caja/AbrirSesionForm'
import { SesionAbiertaPanel } from '@/components/caja/SesionAbiertaPanel'
import { CerrarSesionForm } from '@/components/caja/CerrarSesionForm'
import { CierreDetalle } from '@/components/caja/CierreDetalle'

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export default async function CajaPage() {
  const sesion = await obtenerSesionAbierta()
  const ultimas = await listarSesiones(8)

  let ultimoCierre = null
  if (!sesion && ultimas.length > 0 && ultimas[0].cierre_id) {
    ultimoCierre = await obtenerCierre(ultimas[0].id)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Caja</h1>
        <p className="text-[13px] text-gray-400 mt-1">
          Apertura, cierre y arqueo de sesiones de caja.
        </p>
      </div>

      {sesion ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SesionAbiertaPanel sesion={sesion} />
          <CerrarSesionForm sesion={sesion} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AbrirSesionForm />
          {ultimoCierre && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[13px] font-semibold text-[#0A0A0A]">
                  Último cierre realizado
                </h2>
                <Link
                  href={`/caja/sesiones/${ultimas[0].id}`}
                  className="text-xs text-lime-700 hover:underline"
                >
                  Ver detalle completo →
                </Link>
              </div>
              <CierreDetalle cierre={ultimoCierre} />
            </div>
          )}
        </div>
      )}

      <section>
        <h2 className="text-[15px] font-semibold text-[#0A0A0A] mb-3">Historial reciente</h2>
        {ultimas.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-6 text-center text-sm text-gray-500">
            Todavía no hay sesiones registradas.
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden space-y-3">
              {ultimas.map((s) => (
                <Link
                  key={s.id}
                  href={`/caja/sesiones/${s.id}`}
                  className="block bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-[#0A0A0A]">
                      {formatDateTime(s.fecha_apertura)}
                    </span>
                    {s.estado === 'abierta' ? (
                      <span className="inline-flex rounded-full bg-lime-50 border border-lime-200 px-2 py-0.5 text-xs font-semibold text-lime-700">Abierta</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                        {s.tipo_cierre === 'emergencia' && <span>⚠️</span>}
                        Cerrada
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-gray-400">
                    {nombreUsuario(s.usuario_apertura) ?? 'Sin usuario'}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[13px] text-gray-600">
                      {s.total_ventas_cantidad} ventas · {formatARS(s.total_ventas_monto)}
                    </span>
                    {s.diferencia_efectivo != null && (
                      <span className={`text-xs font-semibold ${
                        s.diferencia_efectivo === 0
                          ? 'text-lime-700'
                          : s.diferencia_efectivo > 0
                          ? 'text-[#0A0A0A]'
                          : 'text-red-600'
                      }`}>
                        {s.diferencia_efectivo > 0 ? '+' : ''}{formatARS(s.diferencia_efectivo)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block bg-white border border-gray-100 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 text-left">
                      <th className="px-3 py-2">Apertura</th>
                      <th className="px-3 py-2">Cierre</th>
                      <th className="px-3 py-2">Usuario</th>
                      <th className="px-3 py-2 text-right">Ventas</th>
                      <th className="px-3 py-2 text-right">Diferencia</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ultimas.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-900">
                          {formatDateTime(s.fecha_apertura)}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {s.fecha_cierre ? formatDateTime(s.fecha_cierre) : '—'}
                        </td>
                        <td className="px-3 py-2 text-gray-700">
                          {nombreUsuario(s.usuario_apertura) ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-900">
                          {s.total_ventas_cantidad}{' '}
                          <span className="text-gray-500">
                            ({formatARS(s.total_ventas_monto)})
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {s.diferencia_efectivo == null ? (
                            '—'
                          ) : s.diferencia_efectivo === 0 ? (
                            <span className="text-lime-700 font-semibold">{formatARS(0)}</span>
                          ) : s.diferencia_efectivo > 0 ? (
                            <span className="text-[#0A0A0A] font-semibold">
                              +{formatARS(s.diferencia_efectivo)}
                            </span>
                          ) : (
                            <span className="text-red-600 font-semibold">
                              {formatARS(s.diferencia_efectivo)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {s.estado === 'abierta' ? (
                            <span className="inline-flex rounded-full bg-lime-50 border border-lime-200 px-2 py-0.5 text-xs font-semibold text-lime-700">
                              Abierta
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                              {s.tipo_cierre === 'emergencia' && <span>⚠️</span>}
                              Cerrada
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            href={`/caja/sesiones/${s.id}`}
                            className="text-xs text-lime-700 hover:underline"
                          >
                            Ver →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>

      <div className="text-sm text-gray-500">
        Volver al{' '}
        <Link href="/dashboard" className="text-lime-700 hover:underline">
          dashboard
        </Link>
        .
      </div>
    </div>
  )
}
