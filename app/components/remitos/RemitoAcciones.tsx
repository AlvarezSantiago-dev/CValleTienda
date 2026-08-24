'use client'

import { useState, useTransition } from 'react'
import { actualizarEstadoRemito } from '@/app/actions/remitos'
import { RegistrarCobroModal, type MetodoPagoCobro } from '@/components/remitos/RegistrarCobroModal'
import { BotonDescargarDoc } from '@/components/documentos/BotonDescargarDoc'
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

  const btnBase =
    'inline-flex items-center justify-center gap-2 min-h-11 h-10 px-4 text-sm font-medium rounded-[var(--radius-full)] transition w-full sm:w-auto'

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

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap items-stretch sm:items-center w-full sm:w-auto">
        {tipo === 'cuenta_corriente' && estadoCobro !== 'cobrado' && montoTotal > 0 && (
          <>
            <span className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-11 bg-warning-soft border border-warning-border text-warning-soft-fg text-xs font-semibold rounded-[var(--radius-full)]">
              Debe: ${saldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </span>
            <button
              type="button"
              onClick={() => setModalCobro(true)}
              className={`${btnBase} bg-primary hover:bg-primary-hover text-primary-fg font-semibold`}
            >
              Registrar cobro
            </button>
          </>
        )}
        {tipo === 'cuenta_corriente' && estadoCobro === 'cobrado' && (
          <span className="inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-11 bg-primary-soft border border-primary-border text-primary-soft-fg text-xs font-semibold rounded-[var(--radius-full)]">
            ✓ Cobrado
          </span>
        )}

        <button
          type="button"
          onClick={() => window.print()}
          className={`${btnBase} border border-border-default text-fg hover:bg-surface-hover`}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M4 6V2h8v4M4 12H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1M4 9h8v5H4z"/>
          </svg>
          Imprimir
        </button>

        <BotonDescargarDoc href={`/api/documentos/remito/${remitoId}`} />

        {transicion && (
          <button
            type="button"
            onClick={() => {
              startTransition(async () => {
                await actualizarEstadoRemito(remitoId, transicion.next)
              })
            }}
            disabled={isPending}
            className={`${btnBase} text-white font-semibold disabled:opacity-50 ${transicion.color}`}
          >
            {isPending ? 'Guardando…' : transicion.label}
          </button>
        )}

        {estadoActual !== 'anulado' && estadoActual !== 'entregado' && (
          <button
            type="button"
            onClick={handleAnular}
            disabled={isPending}
            className={`${btnBase} border border-danger-border text-danger-soft-fg hover:bg-danger-soft disabled:opacity-50`}
          >
            Anular
          </button>
        )}
      </div>
    </>
  )
}
