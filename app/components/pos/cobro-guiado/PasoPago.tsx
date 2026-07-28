'use client'

import type { MetodoPago } from '@/lib/configuracion/queries'
import type { PagoLinea } from '../PagoMultiMetodo'
import { PagoMultiMetodo } from '../PagoMultiMetodo'
import { aplicarPagoRapido, esMetodoEfectivo, focusPrimerMontoPago } from '@/lib/pos/pago-rapido'
import { desgloseVueltoEfectivo } from '@/lib/pos/redondeo-efectivo'
import { formatARS } from '@/lib/format'

interface PasoPagoProps {
  metodos: MetodoPago[]
  totalAPagar: number
  pagos: PagoLinea[]
  onPagosChange: (pagos: PagoLinea[]) => void
  onSiguiente: () => void
  redondeoEfectivoActivo?: boolean
}

const MAX_CHIPS = 4

export function PasoPago({
  metodos,
  totalAPagar,
  pagos,
  onPagosChange,
  onSiguiente,
  redondeoEfectivoActivo = true,
}: PasoPagoProps) {
  const metodoActivoId = pagos.length === 1 ? pagos[0].metodo_pago_id : null
  const visibles = metodos.length <= MAX_CHIPS ? metodos : metodos.slice(0, MAX_CHIPS - 1)
  const extras = metodos.length > MAX_CHIPS ? metodos.slice(MAX_CHIPS - 1) : []

  const cobrado = pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0)
  const { vuelto, ajuste } = desgloseVueltoEfectivo(cobrado, totalAPagar, {
    activo: redondeoEfectivoActivo,
  })

  function seleccionar(metodoId: string) {
    if (totalAPagar <= 0) return
    const metodo = metodos.find((m) => m.id === metodoId)
    const esEfectivo = !!(metodo && esMetodoEfectivo(metodo))
    onPagosChange(
      aplicarPagoRapido(metodoId, totalAPagar, {
        esEfectivo,
        redondeoActivo: redondeoEfectivoActivo,
      })
    )
    if (esEfectivo) {
      focusPrimerMontoPago()
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-gray-900">¿Cómo va a pagar el cliente?</h3>
        <p className="text-4xl font-black text-gray-900 tabular-nums">{formatARS(totalAPagar)}</p>
      </div>

      {metodos.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3">
          {visibles.map((m) => {
            const activo = metodoActivoId === m.id
            return (
              <button
                key={m.id}
                type="button"
                disabled={totalAPagar <= 0}
                onClick={() => seleccionar(m.id)}
                className={[
                  'min-h-[56px] px-6 py-3 rounded-xl text-base font-semibold transition-colors',
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
              disabled={totalAPagar <= 0}
              value=""
              onChange={(e) => {
                if (e.target.value) seleccionar(e.target.value)
              }}
              className="min-h-[56px] px-4 rounded-xl text-base font-medium border border-gray-200 bg-white"
              aria-label="Otros métodos"
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
      )}

      <PagoMultiMetodo
        metodos={metodos}
        pagos={pagos}
        total={totalAPagar}
        onChange={onPagosChange}
        onCobrar={onSiguiente}
        size="large"
        redondeoEfectivoActivo={redondeoEfectivoActivo}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-sm text-gray-500 mb-1">Cobrado</p>
          <p className="text-lg font-bold text-gray-900 tabular-nums">{formatARS(cobrado)}</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-sm text-blue-600 mb-1">Vuelto a entregar</p>
          <p className="text-lg font-bold text-blue-800 tabular-nums">{formatARS(vuelto)}</p>
        </div>
      </div>

      {ajuste > 0 && (
        <p className="text-center text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          Queda en caja {formatARS(ajuste)} (sin monedas) — no se imprime en el ticket
        </p>
      )}

      {redondeoEfectivoActivo && (
        <p className="text-center text-sm text-gray-400">
          Efectivo: vuelto solo en múltiplos de $100
        </p>
      )}
    </div>
  )
}
