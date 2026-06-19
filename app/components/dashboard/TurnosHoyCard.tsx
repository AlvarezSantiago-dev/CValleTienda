'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { SesionHoyItem } from '@/lib/dashboard/queries-sesion-dia'
import { formatARS, formatDateTime } from '@/lib/format'

interface TurnosHoyCardProps {
  sesiones: SesionHoyItem[]
}

export function TurnosHoyCard({ sesiones }: TurnosHoyCardProps) {
  const [expandido, setExpandido] = useState(sesiones.length <= 2)

  if (sesiones.length === 0) return null

  const multiples = sesiones.length > 1

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
      <button
        type="button"
        onClick={() => multiples && setExpandido((v) => !v)}
        className={`w-full px-5 py-4 border-b border-gray-50 flex items-center justify-between text-left ${
          multiples ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
        }`}
      >
        <div>
          <h2 className="text-[14px] font-semibold text-gray-900">
            Turnos de hoy
            {multiples && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                ({sesiones.length} sesiones)
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Cada apertura/cierre de caja. Los KPIs de arriba suman todo el día calendario.
          </p>
        </div>
        {multiples && (
          <span className="text-gray-400 text-sm shrink-0 ml-2">{expandido ? '▾' : '▸'}</span>
        )}
      </button>

      {(expandido || !multiples) && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 text-left">
                <th className="px-4 py-2.5">Apertura</th>
                <th className="px-4 py-2.5">Cierre</th>
                <th className="px-4 py-2.5">Usuario</th>
                <th className="px-4 py-2.5 text-right">Ventas</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sesiones.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-[13px] text-gray-700">
                    {formatDateTime(s.fecha_apertura, { timeStyle: 'short', dateStyle: 'short' })}
                  </td>
                  <td className="px-4 py-2.5 text-[13px] text-gray-500">
                    {s.fecha_cierre
                      ? formatDateTime(s.fecha_cierre, { timeStyle: 'short', dateStyle: 'short' })
                      : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-[13px] text-gray-600">
                    {s.usuario_apertura ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[13px] tabular-nums">
                    {s.total_ventas_cantidad}{' '}
                    <span className="text-gray-400">({formatARS(s.total_ventas_monto)})</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {s.estado === 'abierta' ? (
                      <span className="inline-flex rounded-full bg-lime-50 border border-lime-200 px-2 py-0.5 text-[11px] font-semibold text-lime-700">
                        Abierta
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                        Cerrada
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/caja/sesiones/${s.id}`}
                      className="text-xs font-medium text-lime-700 hover:underline"
                    >
                      Ver →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
