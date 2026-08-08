import { ChartColumn } from 'lucide-react'
import type { GananciaBrutaMes } from '@/lib/dashboard/queries'
import { formatARS } from '@/lib/format'
import { DashboardSectionCard } from './DashboardSectionCard'
import { cn } from '@/components/ui/cn'

interface Props {
  data: GananciaBrutaMes
}

export function GananciaBrutaCard({ data }: Props) {
  const {
    ganancia,
    costoTotal,
    ventasNetas,
    margenPct,
    tieneData,
    totalEgresos,
    totalComisiones,
    resultadoNeto,
  } = data

  const tieneAlgunDato = tieneData || totalEgresos > 0 || totalComisiones > 0

  if (!tieneAlgunDato) {
    return (
      <DashboardSectionCard title="Ganancia bruta" padding="md">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-surface-sunken text-fg-muted shrink-0">
            <ChartColumn size={18} aria-hidden />
          </div>
          <p className="text-sm text-fg-muted">
            Cargá el <strong className="text-fg-secondary">precio de costo</strong> en tus productos
            para ver la ganancia bruta del mes.
          </p>
        </div>
      </DashboardSectionCard>
    )
  }

  const margenTone =
    margenPct == null
      ? 'text-fg-muted'
      : margenPct >= 40
        ? 'text-success-soft-fg'
        : margenPct >= 20
          ? 'text-warning-soft-fg'
          : 'text-danger-soft-fg'

  return (
    <DashboardSectionCard title="Ganancia bruta (mes)" padding="md">
      {tieneData ? (
        <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-3">
          <div className="min-w-0">
            <p className="text-xs text-fg-muted mb-0.5">Ganancia bruta</p>
            <p className="text-base font-bold text-success-soft-fg truncate font-mono tabular-nums">
              {formatARS(ganancia)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-fg-muted mb-0.5">Costo total</p>
            <p className="text-base font-bold text-fg truncate font-mono tabular-nums">
              {formatARS(costoTotal)}
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-xs text-fg-muted mb-0.5">Margen</p>
            <p className={cn('text-base font-bold font-mono tabular-nums', margenTone)}>
              {margenPct != null ? `${margenPct}%` : '—'}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-fg-muted mb-3">
          Cargá el <strong className="text-fg-secondary">precio de costo</strong> en tus productos
          para ver la ganancia bruta.
        </p>
      )}

      {margenPct != null && ventasNetas > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-fg-subtle mb-1">
            <span>Costo</span>
            <span>Ganancia</span>
          </div>
          <div className="h-2 w-full bg-surface-sunken rounded-[var(--radius-full)] overflow-hidden">
            <div
              className="h-full bg-success rounded-[var(--radius-full)]"
              style={{ width: `${Math.min(100, margenPct)}%` }}
            />
          </div>
          <p className="text-xs text-fg-subtle mt-1">
            Sobre {formatARS(ventasNetas)} en ventas netas
          </p>
        </div>
      )}

      {(totalEgresos > 0 || totalComisiones > 0) && (
        <div className="mt-4 pt-4 border-t border-border-subtle space-y-2">
          {totalEgresos > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-fg-muted">Egresos manuales</span>
              <span className="text-sm font-semibold text-danger-soft-fg font-mono tabular-nums">
                −{formatARS(totalEgresos)}
              </span>
            </div>
          )}
          {totalComisiones > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-fg-muted">Comisiones de pago</span>
              <span className="text-sm font-semibold text-danger-soft-fg font-mono tabular-nums">
                −{formatARS(totalComisiones)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-fg-secondary">Resultado neto</span>
            <span
              className={cn(
                'text-sm font-bold font-mono tabular-nums',
                resultadoNeto >= 0 ? 'text-success-soft-fg' : 'text-danger-soft-fg'
              )}
            >
              {formatARS(resultadoNeto)}
            </span>
          </div>
        </div>
      )}
    </DashboardSectionCard>
  )
}
