'use client'

import { formatARS } from '@/lib/format'
import { Button } from '@/components/ui/Button'

interface PanelCobroResumenProps {
  subtotal: number
  descuento: number
  totalAPagar: number
  itemsCount: number
  onCobrar: () => void
  isCobrando: boolean
  puedeCobrar: boolean
  error: string | null
}

export function PanelCobroResumen({
  subtotal,
  descuento,
  totalAPagar,
  itemsCount,
  onCobrar,
  isCobrando,
  puedeCobrar,
  error,
}: PanelCobroResumenProps) {
  return (
    <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden shadow-xs lg:sticky lg:top-4">
      <div className="px-5 py-4 border-b border-border-subtle">
        <h2 className="text-[15px] font-semibold text-fg">Cobrar</h2>
        <p className="text-xs text-fg-muted mt-1">Modo paso a paso activo</p>
      </div>

      <div className="px-5 py-4 space-y-3">
        <div className="flex justify-between text-sm text-fg-muted">
          <span>
            {itemsCount} producto{itemsCount !== 1 ? 's' : ''}
          </span>
          <span className="font-mono tabular-nums">{formatARS(subtotal)}</span>
        </div>
        {descuento > 0 && (
          <div className="flex justify-between text-sm text-warning-soft-fg">
            <span>Descuento</span>
            <span className="font-mono tabular-nums">− {formatARS(descuento)}</span>
          </div>
        )}
        <div className="bg-surface-sunken rounded-[var(--radius-lg)] px-4 py-4 flex flex-col items-center gap-1">
          <span className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
            Total a pagar
          </span>
          <span className="text-[32px] font-bold text-fg font-mono tabular-nums leading-none">
            {formatARS(totalAPagar)}
          </span>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-border-subtle space-y-3">
        {error && (
          <div className="rounded-[var(--radius-md)] border border-danger-border bg-danger-soft px-3 py-2.5 text-sm text-danger-soft-fg">
            {error}
          </div>
        )}
        <Button
          type="button"
          onClick={onCobrar}
          disabled={!puedeCobrar || isCobrando}
          size="lg"
          className="w-full hidden lg:flex"
        >
          {isCobrando ? 'Cobrando…' : `Cobrar ${formatARS(totalAPagar)}`}
        </Button>
        <p className="hidden lg:block text-center text-xs text-fg-muted">
          Presioná{' '}
          <kbd className="font-mono text-[11px] bg-surface-sunken px-1.5 py-0.5 rounded border border-border-default">
            F2
          </kbd>{' '}
          para cobrar paso a paso
        </p>
      </div>
    </div>
  )
}
