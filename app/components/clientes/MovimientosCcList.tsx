import type { MovimientoCc } from '@/types/database'
import { formatARS, formatDateTime } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { BotonImprimirReciboCc } from './BotonImprimirReciboCc'

const LABEL_TIPO: Record<MovimientoCc['tipo'], string> = {
  cargo: 'Cargo',
  pago: 'Pago',
  ajuste: 'Ajuste',
}

interface MovimientosCcListProps {
  movimientos: MovimientoCc[]
}

export function MovimientosCcList({ movimientos }: MovimientosCcListProps) {
  if (movimientos.length === 0) {
    return (
      <EmptyState
        title="Sin movimientos"
        description="Cuando fíes un pedido o registres un cobro, aparece acá."
      />
    )
  }

  return (
    <ul className="divide-y divide-border-subtle border border-border-subtle rounded-[var(--radius-lg)] bg-surface">
      {movimientos.map((m) => {
        const baja = m.tipo === 'pago' || m.tipo === 'ajuste'
        return (
          <li key={m.id} className="px-4 py-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={m.tipo === 'cargo' ? 'warning' : 'success'}>
                  {LABEL_TIPO[m.tipo]}
                </Badge>
                <span className="text-xs text-fg-subtle">{formatDateTime(m.created_at)}</span>
              </div>
              {m.concepto && (
                <p className="mt-1 text-sm text-fg truncate">{m.concepto}</p>
              )}
            </div>
            <div className="text-right shrink-0 space-y-1">
              <p
                className={`text-sm font-bold tabular-nums ${baja ? 'text-success-soft-fg' : 'text-fg'}`}
              >
                {baja ? '−' : '+'}
                {formatARS(m.monto)}
              </p>
              <p className="text-[11px] text-fg-subtle tabular-nums">
                Saldo {formatARS(m.saldo_posterior)}
              </p>
              {m.tipo === 'pago' && (
                <BotonImprimirReciboCc movimientoId={m.id} label="Recibo" />
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
