'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { SesionListItem } from '@/lib/caja/queries'
import type { ResumenMesCaja } from '@/lib/caja/queries'
import { nombreUsuario } from '@/lib/caja/types'
import { formatDateTime, formatDate } from '@/lib/format'

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

function parseMes(mes: string): { anio: number; mes: number } {
  const [a, m] = mes.split('-').map(Number)
  return { anio: a, mes: m }
}

function mesLabel(mesStr: string): string {
  const { anio, mes } = parseMes(mesStr)
  return formatDate(`${anio}-${String(mes).padStart(2, '0')}-01T12:00:00-03:00`, {
    month: 'long',
    year: 'numeric',
  })
}

interface Props {
  sesiones: SesionListItem[]
  resumen: ResumenMesCaja
  mesActual: string
  mesesDisponibles: string[]
}

export function HistorialCajaMes({ sesiones, resumen, mesActual, mesesDisponibles }: Props) {
  const router = useRouter()

  const idxActual = mesesDisponibles.indexOf(mesActual)
  const mesSiguiente = idxActual > 0 ? mesesDisponibles[idxActual - 1] : null
  const mesAnterior = idxActual < mesesDisponibles.length - 1 ? mesesDisponibles[idxActual + 1] : null

  function navegar(mes: string) {
    router.push(`/caja?mes=${mes}`)
  }

  return (
    <section className="space-y-4">
      {/* Cabecera con selector de mes */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-[15px] font-semibold text-gray-900">Historial de sesiones</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => mesAnterior && navegar(mesAnterior)}
            disabled={!mesAnterior}
            className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Mes anterior"
          >
            ←
          </button>
          <span className="min-w-[140px] text-center text-[13px] font-medium text-gray-900 capitalize px-2">
            {mesLabel(mesActual)}
          </span>
          <button
            onClick={() => mesSiguiente && navegar(mesSiguiente)}
            disabled={!mesSiguiente}
            className="h-8 w-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Mes siguiente"
          >
            →
          </button>
        </div>
      </div>

      {/* Resumen del mes */}
      {resumen.total_sesiones > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Sesiones" value={String(resumen.total_sesiones)} />
          <StatCard label="Ventas" value={String(resumen.total_ventas_cantidad)} />
          <StatCard label="Facturado" value={formatARS(resumen.total_ventas_monto)} />
          <StatCard label="Total neto" value={formatARS(resumen.total_neto)} highlight />
        </div>
      )}

      {/* Lista de sesiones */}
      {sesiones.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-100 rounded-xl p-6 text-center text-[13px] text-gray-400">
          No hay sesiones registradas en {mesLabel(mesActual)}.
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {sesiones.map((s) => (
              <Link
                key={s.id}
                href={`/caja/sesiones/${s.id}`}
                className="block bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 hover:shadow-[0_1px_3px_0_rgb(0,0,0,0.06)] transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="text-[13px] font-semibold text-gray-900">
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
                <div className="text-[12px] text-gray-400">
                  {nombreUsuario(s.usuario_apertura) ?? 'Sin usuario'}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[13px] text-gray-600">
                    {s.total_ventas_cantidad} ventas · {formatARS(s.total_ventas_monto)}
                  </span>
                  {s.diferencia_efectivo != null && (
                    <span className={`text-xs font-semibold tabular-nums ${
                      s.diferencia_efectivo === 0
                        ? 'text-lime-700'
                        : s.diferencia_efectivo > 0
                        ? 'text-gray-900'
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
          <div className="hidden sm:block bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 text-left border-b border-gray-50">
                    <th className="px-4 py-3 bg-gray-50/60">Apertura</th>
                    <th className="px-4 py-3 bg-gray-50/60">Cierre</th>
                    <th className="px-4 py-3 bg-gray-50/60">Usuario</th>
                    <th className="px-4 py-3 bg-gray-50/60 text-right">Ventas</th>
                    <th className="px-4 py-3 bg-gray-50/60 text-right">Dif. ef.</th>
                    <th className="px-4 py-3 bg-gray-50/60">Estado</th>
                    <th className="px-4 py-3 bg-gray-50/60"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sesiones.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-[13px] text-gray-900">{formatDateTime(s.fecha_apertura)}</td>
                      <td className="px-4 py-3 text-[13px] text-gray-500">
                        {s.fecha_cierre ? formatDateTime(s.fecha_cierre) : '—'}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-gray-600">
                        {nombreUsuario(s.usuario_apertura) ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] text-gray-900 tabular-nums">
                        {s.total_ventas_cantidad}{' '}
                        <span className="text-gray-400">({formatARS(s.total_ventas_monto)})</span>
                      </td>
                      <td className="px-4 py-3 text-right text-[13px] tabular-nums">
                        {s.diferencia_efectivo == null ? (
                          <span className="text-gray-400">—</span>
                        ) : s.diferencia_efectivo === 0 ? (
                          <span className="text-lime-700 font-semibold">{formatARS(0)}</span>
                        ) : s.diferencia_efectivo > 0 ? (
                          <span className="text-gray-900 font-semibold">+{formatARS(s.diferencia_efectivo)}</span>
                        ) : (
                          <span className="text-red-600 font-semibold">{formatARS(s.diferencia_efectivo)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3">
                        <Link href={`/caja/sesiones/${s.id}`} className="text-xs font-medium text-lime-700 hover:text-lime-800 hover:underline transition-colors">
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
  )
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        highlight
          ? 'border-lime-200 bg-lime-50'
          : 'border-gray-100 bg-white shadow-[0_1px_3px_0_rgb(0,0,0,0.04)]'
      }`}
    >
      <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">{label}</p>
      <p className={`text-[15px] font-semibold tabular-nums mt-0.5 ${highlight ? 'text-lime-800' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  )
}
