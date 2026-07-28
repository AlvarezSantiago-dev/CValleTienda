'use client'

import type { MetodoPago } from '@/lib/configuracion/queries'
import type { PagoLinea } from './PagoMultiMetodo'
import { aplicarPagoRapido, esMetodoEfectivo, focusPrimerMontoPago } from '@/lib/pos/pago-rapido'

interface PagoRapidoChipsProps {
  metodos: MetodoPago[]
  total: number
  pagos: PagoLinea[]
  onChange: (pagos: PagoLinea[]) => void
  redondeoEfectivoActivo?: boolean
}

const MAX_CHIPS = 4

export function PagoRapidoChips({
  metodos,
  total,
  pagos,
  onChange,
  redondeoEfectivoActivo = true,
}: PagoRapidoChipsProps) {
  const metodoActivoId =
    pagos.length === 1 ? pagos[0].metodo_pago_id : null

  const visibles = metodos.length <= MAX_CHIPS ? metodos : metodos.slice(0, MAX_CHIPS - 1)
  const extras = metodos.length > MAX_CHIPS ? metodos.slice(MAX_CHIPS - 1) : []

  function seleccionar(metodoId: string) {
    if (total <= 0) return
    const metodo = metodos.find((m) => m.id === metodoId)
    const esEfectivo = !!(metodo && esMetodoEfectivo(metodo))
    onChange(
      aplicarPagoRapido(metodoId, total, {
        esEfectivo,
        redondeoActivo: redondeoEfectivoActivo,
      })
    )
    if (esEfectivo) {
      focusPrimerMontoPago()
    }
  }

  if (metodos.length === 0) return null

  return (
    <div className="space-y-2 mb-3">
      <div className="flex flex-wrap gap-2">
        {visibles.map((m) => {
          const activo = metodoActivoId === m.id
          return (
            <button
              key={m.id}
              type="button"
              disabled={total <= 0}
              onClick={() => seleccionar(m.id)}
              className={[
                'min-h-[44px] px-4 py-2 rounded-xl text-[13px] font-semibold transition-colors',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                activo
                  ? 'bg-lime-500 text-[#0A0A0A] ring-2 ring-lime-600/30'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800',
              ].join(' ')}
            >
              {m.nombre}
            </button>
          )
        })}
        {extras.length > 0 && (
          <select
            disabled={total <= 0}
            value=""
            onChange={(e) => {
              if (e.target.value) seleccionar(e.target.value)
            }}
            className="min-h-[44px] px-3 py-2 rounded-xl text-[13px] font-medium border border-gray-200 bg-white text-gray-700 disabled:opacity-40"
            aria-label="Otros métodos de pago"
          >
            <option value="">Más métodos…</option>
            {extras.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        )}
      </div>
      {redondeoEfectivoActivo && (
        <p className="text-[11px] text-gray-400">
          Efectivo: vuelto solo en billetes de $100 (el resto queda en caja)
        </p>
      )}
    </div>
  )
}
