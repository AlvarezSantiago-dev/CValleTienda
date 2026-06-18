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
    porcentajeListo === 100 ? 'bg-lime-500' : porcentajeListo >= 60 ? 'bg-lime-400' : 'bg-amber-400'

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 space-y-2">
      <p className="text-xs text-gray-600">
        <span className="font-semibold text-gray-800">{total}</span> variantes
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
            <span className="font-medium text-amber-700">{pendientes} pendientes</span>
          </>
        )}
      </p>

      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
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
            className="text-xs px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
          >
            {sinCodigo} sin código
          </button>
        )}
        {!modoEdicion && sinStock > 0 && onIrSinStock && (
          <button
            type="button"
            onClick={onIrSinStock}
            className="text-xs px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
          >
            {sinStock} sin stock
          </button>
        )}
        {porcentajeListo < 100 && primeraIncompletaIdx !== null && (
          <button
            type="button"
            onClick={() => onIrIncompleta(primeraIncompletaIdx)}
            className="text-xs ml-auto px-3 py-1 rounded-lg border border-lime-300 bg-lime-50 text-lime-800 font-medium hover:bg-lime-100 transition-colors"
          >
            Ir a la siguiente →
          </button>
        )}
        {porcentajeListo === 100 && (
          <span className="text-xs ml-auto text-lime-700 font-medium">✓ Listo para guardar</span>
        )}
      </div>
    </div>
  )
}
