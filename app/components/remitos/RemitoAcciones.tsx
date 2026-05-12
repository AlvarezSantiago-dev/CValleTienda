'use client'

import { useTransition } from 'react'
import { actualizarEstadoRemito } from '@/app/actions/remitos'
import type { EstadoRemito } from '@/types/database'

const TRANSICIONES: Record<EstadoRemito, { label: string; next: EstadoRemito; color: string } | null> = {
  borrador:  { label: 'Emitir', next: 'emitido',   color: 'bg-[#0A0A0A] hover:bg-gray-800' },
  emitido:   { label: 'Marcar entregado', next: 'entregado', color: 'bg-lime-600 hover:bg-lime-700' },
  entregado: null,
  anulado:   null,
}

interface Props {
  remitoId: string
  estadoActual: EstadoRemito
}

export function RemitoAcciones({ remitoId, estadoActual }: Props) {
  const [isPending, startTransition] = useTransition()
  const transicion = TRANSICIONES[estadoActual]

  const handleAnular = () => {
    if (!confirm('¿Anular este remito? Esta acción no se puede deshacer.')) return
    startTransition(async () => {
      await actualizarEstadoRemito(remitoId, 'anulado')
    })
  }

  return (
    <div className="flex gap-3 flex-wrap">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 h-10 px-4 border border-gray-200 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-50 transition"
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
          className={`h-10 px-4 text-white text-sm font-semibold rounded-full transition disabled:opacity-50 ${transicion.color}`}
        >
          {isPending ? 'Guardando…' : transicion.label}
        </button>
      )}

      {estadoActual !== 'anulado' && estadoActual !== 'entregado' && (
        <button
          type="button"
          onClick={handleAnular}
          disabled={isPending}
          className="h-10 px-4 border border-red-200 text-red-600 text-sm font-medium rounded-full hover:bg-red-50 transition disabled:opacity-50"
        >
          Anular
        </button>
      )}
    </div>
  )
}
