'use client'

import type { ResumenVariantes } from '@/lib/productos/variantes-estado'

interface VariantesResumenBarProps {
  resumen: ResumenVariantes
  modoEdicion: boolean
  onIrIncompleta: (idx: number) => void
  onIrSinCodigo?: () => void
  onIrSinStock?: () => void
}

export function VariantesResumenBar({
  resumen,
  modoEdicion,
  onIrIncompleta,
  onIrSinCodigo,
  onIrSinStock,
}: VariantesResumenBarProps) {
  if (resumen.total === 0) return null

  const {
    total,
    conCodigo,
    conStock,
    completas,
    sinCodigo,
    sinStock,
    porcentajeListo,
    primeraIncompletaIdx,
  } = resumen

  const pendientes = total - completas
  const barColor =
    porcentajeListo === 100 ? 'bg-primary' : porcentajeListo >= 60 ? 'bg-brand-400' : 'bg-amber-400'

  return (
    <div className="rounded-[var(--radius-lg)] border border-border-default bg-surface px-4 py-3 space-y-2">
      <p className="text-xs text-fg-muted">
        <span className="font-semibold text-fg">{total}</span> variantes
        {' · '}
        <span className="font-medium">{conCodigo}</span> con código
        {!modoEdicion && (
          <>
            {' · '}
            <span className="font-medium">{conStock}</span> con stock
          </>
        )}
        {pendientes > 0 && (
          <>
            {' · '}
            <span className="font-medium text-warning-soft-fg">{pendientes} pendientes</span>
          </>
        )}
      </p>

      <div className="h-2 rounded-full bg-surface-sunken overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${porcentajeListo}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {sinCodigo > 0 && onIrSinCodigo && (
          <button
            type="button"
            onClick={onIrSinCodigo}
            className="text-xs px-2.5 py-1 rounded-full border border-warning-border bg-warning-soft text-warning-soft-fg hover:bg-amber-100 transition-colors"
          >
            {sinCodigo} sin código
          </button>
        )}
        {!modoEdicion && sinStock > 0 && onIrSinStock && (
          <button
            type="button"
            onClick={onIrSinStock}
            className="text-xs px-2.5 py-1 rounded-full border border-warning-border bg-warning-soft text-warning-soft-fg hover:bg-amber-100 transition-colors"
          >
            {sinStock} sin stock
          </button>
        )}
        {porcentajeListo < 100 && primeraIncompletaIdx !== null && (
          <button
            type="button"
            onClick={() => onIrIncompleta(primeraIncompletaIdx)}
            className="text-xs ml-auto px-3 py-1 rounded-[var(--radius-md)] border border-primary-border bg-primary-soft text-primary-soft-fg font-medium hover:bg-primary-soft transition-colors"
          >
            Ir a la siguiente →
          </button>
        )}
        {porcentajeListo === 100 && (
          <span className="text-xs ml-auto text-fg-brand font-medium">✓ Listo para guardar</span>
        )}
      </div>
    </div>
  )
}
