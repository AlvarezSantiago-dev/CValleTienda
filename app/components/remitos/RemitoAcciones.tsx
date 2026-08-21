'use client'

import { useState, useTransition } from 'react'
import { actualizarEstadoRemito } from '@/app/actions/remitos'
import { RegistrarCobroModal, type MetodoPagoCobro } from '@/components/remitos/RegistrarCobroModal'
import type { EstadoRemito, TipoRemito, EstadoCobro } from '@/types/database'

const TRANSICIONES: Record<EstadoRemito, { label: string; next: EstadoRemito; color: string } | null> = {
  borrador:  { label: 'Emitir', next: 'emitido',   color: 'bg-fg hover:bg-fg-muted' },
  emitido:   { label: 'Marcar entregado', next: 'entregado', color: 'bg-primary hover:bg-primary-hover' },
  entregado: null,
  anulado:   null,
}

interface Props {
  remitoId: string
  estadoActual: EstadoRemito
  tipo: TipoRemito
  estadoCobro: EstadoCobro
  montoTotal: number
  montoCobrado: number
  metodosPago: MetodoPagoCobro[]
}

export function RemitoAcciones({
  remitoId,
  estadoActual,
  tipo,
  estadoCobro,
  montoTotal,
  montoCobrado,
  metodosPago,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [modalCobro, setModalCobro] = useState(false)
  const transicion = TRANSICIONES[estadoActual]
  const saldo = montoTotal - montoCobrado

  const handleAnular = () => {
    if (!confirm('¿Anular este remito? Esta acción no se puede deshacer.')) return
    startTransition(async () => {
      await actualizarEstadoRemito(remitoId, 'anulado')
    })
  }

  return (
    <>
      {modalCobro && (
        <RegistrarCobroModal
          remitoId={remitoId}
          montoTotal={montoTotal}
          montoCobrado={montoCobrado}
          metodosPago={metodosPago}
          onClose={() => setModalCobro(false)}
          onSuccess={() => window.location.reload()}
        />
      )}

      <div className="flex gap-3 flex-wrap items-center">
        {/* Cobro badge + botón (solo cuenta corriente pendiente) */}
        {tipo === 'cuenta_corriente' && estadoCobro !== 'cobrado' && montoTotal > 0 && (
          <>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-warning-soft border border-warning-border text-warning-soft-fg text-xs font-semibold rounded-[var(--radius-full)]">
              Debe: ${saldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
            <button
              type="button"
              onClick={() => setModalCobro(true)}
              className="h-10 px-4 bg-primary hover:bg-primary-hover text-primary-fg text-sm font-semibold rounded-[var(--radius-full)] transition"
            >
              Registrar cobro
            </button>
          </>
        )}
        {tipo === 'cuenta_corriente' && estadoCobro === 'cobrado' && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-soft border border-primary-border text-primary-soft-fg text-xs font-semibold rounded-[var(--radius-full)]">
            ✓ Cobrado
          </span>
        )}

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 h-10 px-4 border border-border-default text-fg text-sm font-medium rounded-[var(--radius-full)] hover:bg-surface-hover transition"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 6V2h8v4M4 12H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1M4 9h8v5H4z"/>
          </svg>
          Imprimir
        </button>

        {transicion && (
          <button
            type="button"
            onClick={() => {
              startTransition(async () => {
                await actualizarEstadoRemito(remitoId, transicion.next)
              })
            }}
            disabled={isPending}
            className={`h-10 px-4 text-white text-sm font-semibold rounded-[var(--radius-full)] transition disabled:opacity-50 ${transicion.color}`}
          >
            {isPending ? 'Guardando…' : transicion.label}
          </button>
        )}

        {estadoActual !== 'anulado' && estadoActual !== 'entregado' && (
          <button
            type="button"
            onClick={handleAnular}
            disabled={isPending}
            className="h-10 px-4 border border-danger-border text-danger-soft-fg text-sm font-medium rounded-[var(--radius-full)] hover:bg-danger-soft transition disabled:opacity-50"
          >
            Anular
          </button>
        )}
      </div>
    </>
  )
}

