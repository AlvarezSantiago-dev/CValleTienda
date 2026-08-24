'use client'

import type { ResumenTurno } from '@/lib/caja/types'
import { formatARS } from '@/lib/format-moneda'
import { LabelAyuda } from '@/components/caja/LabelAyuda'
import { cn } from '@/components/ui/cn'

interface Props {
  resumen: ResumenTurno
  className?: string
}

export function MetricasTurnoStrip({ resumen, className }: Props) {
  const hintDev =
    resumen.total_devoluciones_credito > 0
      ? `${formatARS(resumen.total_devoluciones_monto)} · Reintegros ${formatARS(resumen.total_devoluciones_reintegro)} · Créditos ${formatARS(resumen.total_devoluciones_credito)}`
      : formatARS(resumen.total_devoluciones_monto)

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-4 gap-3', className)}>
      <Kpi
        label={<LabelAyuda label="Ventas" clave="ventasTurno" className="text-xs text-fg-muted" />}
        value={String(resumen.total_ventas_cantidad)}
        hint={formatARS(resumen.total_ventas_monto)}
      />
      <Kpi
        label={
          <LabelAyuda label="Devoluciones" clave="devolucionesTurno" className="text-xs text-fg-muted" />
        }
        value={String(resumen.total_devoluciones_cantidad)}
        hint={hintDev}
      />
      <Kpi
        label={<LabelAyuda label="Comisiones" clave="comisiones" className="text-xs text-fg-muted" />}
        value={formatARS(resumen.total_comisiones)}
      />
      <Kpi
        label={
          <LabelAyuda label="Total neto" clave="totalNetoTurno" className="text-xs text-fg-muted" />
        }
        value={formatARS(resumen.total_neto)}
        highlight
      />
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
  highlight,
}: {
  label: React.ReactNode
  value: string
  hint?: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-md)] border px-3 py-2',
        highlight ? 'border-primary-border bg-primary-soft' : 'border-border-default bg-surface'
      )}
    >
      <div className="mb-0.5">{label}</div>
      <p
        className={cn(
          'text-base font-semibold tabular-nums',
          highlight ? 'text-primary-soft-fg' : 'text-fg'
        )}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-fg-subtle mt-0.5 tabular-nums leading-snug">{hint}</p>}
    </div>
  )
}
