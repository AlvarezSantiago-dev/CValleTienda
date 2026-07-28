'use client'

import type { MetodoPago } from '@/lib/configuracion/queries'
import { InputMonedaARS } from '@/components/ui/InputMonedaARS'
import {
  desgloseVueltoEfectivo,
  sugerirMontoEfectivo,
} from '@/lib/pos/redondeo-efectivo'

export interface PagoLinea {
  id: string
  metodo_pago_id: string
  monto: number
  referencia: string
}

interface PagoMultiMetodoProps {
  metodos: MetodoPago[]
  pagos: PagoLinea[]
  total: number
  onChange: (pagos: PagoLinea[]) => void
  onCobrar?: () => void
  size?: 'default' | 'large'
  /** Si false, no ceil ni retención de vuelto &lt; $100 */
  redondeoEfectivoActivo?: boolean
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

function nuevoId() {
  return Math.random().toString(36).slice(2, 10)
}

function esEfectivoMetodo(metodos: MetodoPago[], metodoId: string) {
  return metodos.find((m) => m.id === metodoId)?.cuenta_fondo?.tipo === 'efectivo'
}

export function PagoMultiMetodo({
  metodos,
  pagos,
  total,
  onChange,
  onCobrar,
  size = 'default',
  redondeoEfectivoActivo = true,
}: PagoMultiMetodoProps) {
  const large = size === 'large'
  const inputH = large ? 'h-12 text-lg' : 'h-10 text-sm'
  const selectH = large ? 'h-12 text-base' : 'h-10 text-sm'
  const cobrado = pagos.reduce((acc, p) => acc + (Number(p.monto) || 0), 0)
  const resta = Math.max(0, total - cobrado)
  const opts = { activo: redondeoEfectivoActivo }
  const { vuelto, ajuste } = desgloseVueltoEfectivo(cobrado, total, opts)

  function add(metodoId?: string) {
    const m = metodoId ?? metodos[0]?.id
    if (!m) return
    const base = resta > 0 ? resta : 0
    const monto = esEfectivoMetodo(metodos, m)
      ? sugerirMontoEfectivo(base, opts)
      : Math.round(base * 100) / 100
    onChange([
      ...pagos,
      {
        id: nuevoId(),
        metodo_pago_id: m,
        monto,
        referencia: '',
      },
    ])
  }

  function update(id: string, patch: Partial<PagoLinea>) {
    onChange(pagos.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function remove(id: string) {
    onChange(pagos.filter((p) => p.id !== id))
  }

  function autoCompletar() {
    if (pagos.length === 0) {
      add()
      return
    }
    const last = pagos[pagos.length - 1]
    const sumado = Number(last.monto) + resta
    const monto = esEfectivoMetodo(metodos, last.metodo_pago_id)
      ? sugerirMontoEfectivo(sumado, opts)
      : Math.round(sumado * 100) / 100
    update(last.id, { monto })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className={large ? 'text-base font-semibold text-gray-900' : 'text-sm font-medium text-gray-900'}>
          Pagos
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => add()}
            className="text-xs font-semibold text-lime-700 hover:text-lime-900 min-h-[32px] px-1"
          >
            + Otro pago
          </button>
          {resta > 0 && (
            <button
              type="button"
              onClick={autoCompletar}
              className="text-xs font-semibold text-lime-700 hover:text-lime-900 min-h-[32px] px-1"
            >
              Auto-completar
            </button>
          )}
        </div>
      </div>

      {pagos.length === 0 ? (
        <p className="text-xs text-gray-500 italic">Elegí un método arriba o + Otro pago.</p>
      ) : (
        <div className="space-y-2">
          {pagos.map((p, index) => {
            const m = metodos.find((x) => x.id === p.metodo_pago_id)
            const requiereRef = m && (m.cuenta_fondo?.tipo ?? '') !== 'efectivo'
            return (
              <div
                key={p.id}
                className="grid grid-cols-12 gap-2 items-start bg-gray-50 border border-gray-200 rounded-lg p-2"
              >
                <select
                  value={p.metodo_pago_id}
                  onChange={(e) => update(p.id, { metodo_pago_id: e.target.value })}
                  className={`col-span-5 px-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-lime-400/60 bg-white ${selectH}`}
                >
                  {metodos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                      {m.comision_porcentaje > 0 ? ` (${m.comision_porcentaje}%)` : ''}
                    </option>
                  ))}
                </select>
                <div className="col-span-3">
                  <InputMonedaARS
                    value={Number(p.monto) || 0}
                    data-pago-monto={index === 0 ? '' : undefined}
                    onChange={(n) => update(p.id, { monto: n })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        onCobrar?.()
                      }
                    }}
                    size={large ? 'large' : 'default'}
                  />
                </div>
                <input
                  type="text"
                  value={p.referencia}
                  onChange={(e) => update(p.id, { referencia: e.target.value })}
                  placeholder={requiereRef ? 'Referencia (opcional)' : 'Ref'}
                  className={`col-span-3 px-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-lime-400/60 ${inputH}`}
                />
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="col-span-1 h-9 text-red-600 hover:text-red-800 text-lg"
                  aria-label="Eliminar pago"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-gray-200">
        <div>
          <p className="text-gray-500">Cobrado</p>
          <p className="font-semibold text-gray-900">{formatARS(cobrado)}</p>
        </div>
        <div>
          <p className="text-gray-500">Resta</p>
          <p
            className={`font-semibold ${
              resta > 0 ? 'text-amber-700' : 'text-green-700'
            }`}
          >
            {formatARS(resta)}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Vuelto</p>
          <p
            className={`font-semibold ${
              vuelto > 0 ? 'text-blue-700' : 'text-gray-900'
            }`}
          >
            {formatARS(vuelto)}
          </p>
        </div>
      </div>

      {ajuste > 0 && (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
          Ajuste redondeo {formatARS(ajuste)} — queda en caja (sin monedas)
        </p>
      )}
    </div>
  )
}
