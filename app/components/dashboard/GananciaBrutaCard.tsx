import { ChartColumn } from 'lucide-react'
import type { GananciaAlDia, GananciaBrutaMes } from '@/lib/dashboard/queries'
import { formatARS } from '@/lib/format'
import { DashboardSectionCard } from './DashboardSectionCard'
import { cn } from '@/components/ui/cn'

interface Props {
  data: GananciaAlDia
}

function Row({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'danger' | 'muted'
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-fg-muted">{label}</span>
      <span
        className={cn(
          'text-sm font-semibold font-mono tabular-nums',
          tone === 'danger' ? 'text-danger-soft-fg' : 'text-fg'
        )}
      >
        {value}
      </span>
    </div>
  )
}

function Desglose({ data }: { data: GananciaBrutaMes }) {
  return (
    <div className="space-y-1.5">
      {data.tieneData && <Row label="Ganancia bruta (margen)" value={formatARS(data.ganancia)} />}
      {data.tieneData && <Row label="Costo" value={formatARS(data.costoTotal)} />}
      {data.totalComisiones > 0 && (
        <Row label="Comisiones" value={`−${formatARS(data.totalComisiones)}`} tone="danger" />
      )}
      {data.totalEgresos > 0 && (
        <Row label="Egresos" value={`−${formatARS(data.totalEgresos)}`} tone="danger" />
      )}
    </div>
  )
}

export function GananciaBrutaCard({ data }: Props) {
  const { hoy, mes } = data
  const tieneAlgunDato =
    hoy.tieneData ||
    mes.tieneData ||
    hoy.totalEgresos > 0 ||
    hoy.totalComisiones > 0 ||
    mes.totalEgresos > 0 ||
    mes.totalComisiones > 0

  if (!tieneAlgunDato) {
    return (
      <DashboardSectionCard
        title="Ganancia neta al día"
        description="Margen de ventas menos costos, comisiones y egresos. No es el disponible de las cuentas."
        padding="md"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-surface-sunken text-fg-muted shrink-0">
            <ChartColumn size={18} aria-hidden />
          </div>
          <p className="text-sm text-fg-muted">
            Cargá el <strong className="text-fg-secondary">precio de costo</strong> en tus productos
            para ver la ganancia neta.
          </p>
        </div>
      </DashboardSectionCard>
    )
  }

  return (
    <DashboardSectionCard
      title="Ganancia neta al día"
      description="Margen menos costos, comisiones y egresos. No es el disponible de las cuentas."
      action={{ label: 'Ver reportes', href: '/reportes' }}
      padding="md"
    >
      <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-fg-subtle">Hoy</p>
      <p
        className={cn(
          'text-2xl font-bold truncate font-mono tabular-nums',
          hoy.resultadoNeto >= 0 ? 'text-success-soft-fg' : 'text-danger-soft-fg'
        )}
      >
        {formatARS(hoy.resultadoNeto)}
      </p>
      <Desglose data={hoy} />

      <div className="mt-4 pt-4 border-t border-border-subtle">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-fg-subtle">
            Mes en curso
          </p>
          <p
            className={cn(
              'text-base font-bold font-mono tabular-nums',
              mes.resultadoNeto >= 0 ? 'text-success-soft-fg' : 'text-danger-soft-fg'
            )}
          >
            {formatARS(mes.resultadoNeto)}
          </p>
        </div>
        <div className="mt-2">
          <Desglose data={mes} />
        </div>
      </div>

      {!hoy.tieneData && !mes.tieneData && (
        <p className="mt-4 text-xs text-fg-muted">
          Cargá el precio de costo en productos para restar mercadería del margen.
        </p>
      )}

      <p className="mt-4 text-xs text-fg-muted">
        Un egreso en Caja baja esta ganancia neta y el disponible de esa cuenta.
      </p>
    </DashboardSectionCard>
  )
}
