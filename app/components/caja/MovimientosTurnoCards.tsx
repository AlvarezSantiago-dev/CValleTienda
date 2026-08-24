'use client'

import { nombreUsuario, type MovimientoTurno } from '@/lib/caja/types'
import { labelTipoCuenta } from '@/lib/caja/labels'
import { formatDateTime } from '@/lib/format'
import { formatARS } from '@/lib/format-moneda'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

interface Props {
  movimientos: MovimientoTurno[]
  editable?: boolean
  onEdit?: (m: MovimientoTurno) => void
  onDelete?: (m: MovimientoTurno) => void
  eliminandoId?: string | null
  pending?: boolean
}

export function MovimientosTurnoCards({
  movimientos,
  editable = false,
  onEdit,
  onDelete,
  eliminandoId,
  pending,
}: Props) {
  return (
    <ul className="md:hidden space-y-2">
      {movimientos.map((m) => {
        const autor = nombreUsuario(m.usuario)
        return (
          <li
            key={m.id}
            className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <Badge
                variant={
                  m.tipo === 'ingreso' ? 'brand' : m.tipo === 'egreso' ? 'danger' : 'neutral'
                }
              >
                {m.tipo === 'ingreso' ? 'Ingreso' : m.tipo === 'egreso' ? 'Egreso' : 'Ajuste'}
                {!m.es_manual && ' · venta'}
              </Badge>
              <span className="text-[13px] font-bold tabular-nums text-fg shrink-0">
                {m.tipo === 'egreso' ? '−' : '+'}
                {formatARS(m.monto)}
              </span>
            </div>
            <p className="text-[13px] font-medium text-fg leading-snug">{m.concepto}</p>
            <p className="text-[12px] text-fg-muted">
              {m.nombre_cuenta}
              {m.tipo_cuenta ? ` · ${labelTipoCuenta(m.tipo_cuenta)}` : ''}
            </p>
            <p className="text-[11px] text-fg-subtle">
              {formatDateTime(m.created_at)}
              {' · '}
              {autor ?? (m.es_manual ? '—' : 'Sistema')}
            </p>
            {editable && m.es_manual && m.tipo !== 'ajuste' && (
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 flex-1"
                  onClick={() => onEdit?.(m)}
                  disabled={pending}
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11 flex-1 border-danger-border text-danger-soft-fg"
                  onClick={() => onDelete?.(m)}
                  disabled={pending}
                >
                  {eliminandoId === m.id ? '…' : 'Eliminar'}
                </Button>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
