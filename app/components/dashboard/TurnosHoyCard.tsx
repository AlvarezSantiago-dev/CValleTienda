'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { SesionHoyItem } from '@/lib/dashboard/queries-sesion-dia'
import { formatARS, formatDateTime } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { DashboardSectionCard } from './DashboardSectionCard'
import { cn } from '@/components/ui/cn'

interface TurnosHoyCardProps {
  sesiones: SesionHoyItem[]
}

export function TurnosHoyCard({ sesiones }: TurnosHoyCardProps) {
  const [expandido, setExpandido] = useState(sesiones.length <= 2)

  if (sesiones.length === 0) return null

  const multiples = sesiones.length > 1
  const mostrar = expandido || !multiples

  return (
    <DashboardSectionCard
      title="Turnos de hoy"
      description={
        multiples
          ? `${sesiones.length} sesiones · los KPIs de arriba suman todo el día calendario`
          : 'Cada apertura/cierre de caja. Los KPIs de arriba suman todo el día calendario.'
      }
    >
      {multiples && (
        <button
          type="button"
          onClick={() => setExpandido((v) => !v)}
          className="w-full px-5 py-2.5 flex items-center justify-between text-xs font-medium text-fg-muted hover:bg-surface-hover cursor-pointer focus-ring border-b border-border-subtle"
        >
          <span>{expandido ? 'Ocultar detalle' : 'Ver detalle de turnos'}</span>
          {expandido ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}
        </button>
      )}

      {mostrar && (
        <>
          {/* Mobile cards */}
          <ul className="md:hidden divide-y divide-border-subtle">
            {sesiones.map((s) => (
              <li key={s.id} className="px-5 py-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={s.estado === 'abierta' ? 'success' : 'neutral'}>
                    {s.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
                  </Badge>
                  <Link
                    href={`/caja/sesiones/${s.id}`}
                    className="text-xs font-medium text-fg-brand hover:underline focus-ring rounded-[var(--radius-sm)]"
                  >
                    Ver →
                  </Link>
                </div>
                <p className="text-sm text-fg">
                  {formatDateTime(s.fecha_apertura, { timeStyle: 'short', dateStyle: 'short' })}
                  {s.fecha_cierre
                    ? ` → ${formatDateTime(s.fecha_cierre, { timeStyle: 'short', dateStyle: 'short' })}`
                    : ' → —'}
                </p>
                <p className="text-xs text-fg-muted">
                  {s.usuario_apertura ?? '—'} · {s.total_ventas_cantidad} ventas ·{' '}
                  <span className="font-mono tabular-nums text-fg">{formatARS(s.total_ventas_monto)}</span>
                </p>
              </li>
            ))}
          </ul>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-sunken">
                <tr className="text-xs uppercase tracking-wider font-semibold text-fg-subtle text-left">
                  <th className="px-4 py-2.5">Apertura</th>
                  <th className="px-4 py-2.5">Cierre</th>
                  <th className="px-4 py-2.5">Usuario</th>
                  <th className="px-4 py-2.5 text-right">Ventas</th>
                  <th className="px-4 py-2.5">Estado</th>
                  <th className="px-4 py-2.5"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {sesiones.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-hover transition-colors duration-(--duration-fast)">
                    <td className="px-4 py-2.5 text-fg-secondary">
                      {formatDateTime(s.fecha_apertura, { timeStyle: 'short', dateStyle: 'short' })}
                    </td>
                    <td className="px-4 py-2.5 text-fg-muted">
                      {s.fecha_cierre
                        ? formatDateTime(s.fecha_cierre, { timeStyle: 'short', dateStyle: 'short' })
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-fg-muted">{s.usuario_apertura ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-fg">
                      {s.total_ventas_cantidad}{' '}
                      <span className="text-fg-subtle">({formatARS(s.total_ventas_monto)})</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={s.estado === 'abierta' ? 'success' : 'neutral'}>
                        {s.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/caja/sesiones/${s.id}`}
                        className={cn(
                          'text-xs font-medium text-fg-brand hover:underline focus-ring rounded-[var(--radius-sm)]'
                        )}
                      >
                        Ver →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DashboardSectionCard>
  )
}
