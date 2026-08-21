'use client'

import type { MetodoPago } from '@/lib/configuracion/queries'
import { InputMonedaARS } from '@/components/ui/InputMonedaARS'
import { formatARS } from '@/lib/format'
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
  size?: 'default' | 'large' | 'xl'
  /** Si false, no ceil ni retención de vuelto &lt; $100 */
  redondeoEfectivoActivo?: boolean
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
  const cobroXl = size === 'large' || size === 'xl'
  const montoSize = cobroXl ? 'xl' : 'large'
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
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className={cobroXl ? 'text-base font-semibold text-fg' : 'text-sm font-medium text-fg'}>
          Pagos
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => add()}
            className="text-xs font-semibold text-fg-brand hover:text-fg-brand min-h-[44px] px-2 cursor-pointer"
          >
            + Otro pago
          </button>
          {resta > 0 && (
            <button
              type="button"
              onClick={autoCompletar}
              className="text-xs font-semibold text-fg-brand hover:text-fg-brand min-h-[44px] px-2 cursor-pointer"
            >
              Auto-completar
            </button>
          )}
        </div>
      </div>

      {pagos.length === 0 ? (
        <p className="text-sm text-fg-muted italic">Elegí un método arriba o + Otro pago.</p>
      ) : (
        <div className="space-y-3">
          {pagos.map((p, index) => {
            const m = metodos.find((x) => x.id === p.metodo_pago_id)
            const requiereRef = m && (m.cuenta_fondo?.tipo ?? '') !== 'efectivo'
            return (
              <div
                key={p.id}
                className="flex flex-col gap-2 bg-surface-sunken border border-border-default rounded-[var(--radius-md)] p-3"
              >
                <div className="flex items-center gap-2">
                  <select
                    value={p.metodo_pago_id}
                    onChange={(e) => update(p.id, { metodo_pago_id: e.target.value })}
                    className="flex-1 min-h-[44px] px-3 border border-border-strong rounded-[var(--radius-md)] bg-surface text-fg focus:ring-2 focus:ring-primary/40"
                  >
                    {metodos.map((metodo) => (
                      <option key={metodo.id} value={metodo.id}>
                        {metodo.nombre}
                        {metodo.comision_porcentaje > 0 ? ` (${metodo.comision_porcentaje}%)` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => remove(p.id)}
                    className="shrink-0 min-h-[44px] min-w-[44px] text-danger hover:text-danger-hover text-lg cursor-pointer"
                    aria-label="Eliminar pago"
                  >
                    ×
                  </button>
                </div>
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
                  size={montoSize}
                  className="w-full"
                />
                <input
                  type="text"
                  value={p.referencia}
                  onChange={(e) => update(p.id, { referencia: e.target.value })}
                  placeholder={requiereRef ? 'Referencia (opcional)' : 'Ref'}
                  className="w-full min-h-[44px] px-3 border border-border-strong rounded-[var(--radius-md)] bg-surface text-fg focus:ring-2 focus:ring-primary/40"
                />
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border-default">
        <div className="rounded-[var(--radius-md)] bg-surface-sunken px-3 py-2">
          <p className="text-sm text-fg-muted">Cobrado</p>
          <p className="text-sm sm:text-base font-semibold text-fg tabular-nums">{formatARS(cobrado)}</p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-surface-sunken px-3 py-2">
          <p className="text-sm text-fg-muted">Resta</p>
          <p
            className={`text-sm sm:text-base font-semibold tabular-nums ${
              resta > 0 ? 'text-warning-soft-fg' : 'text-success-soft-fg'
            }`}
          >
            {formatARS(resta)}
          </p>
        </div>
        <div
          className={`rounded-[var(--radius-md)] px-3 py-2 ${
            vuelto > 0 ? 'bg-info-soft' : 'bg-surface-sunken'
          }`}
        >
          <p className={`text-sm ${vuelto > 0 ? 'text-info-soft-fg' : 'text-fg-muted'}`}>Vuelto</p>
          <p
            className={`text-sm sm:text-base font-semibold tabular-nums ${
              vuelto > 0 ? 'text-info-soft-fg' : 'text-fg'
            }`}
          >
            {formatARS(vuelto)}
          </p>
        </div>
      </div>

      {ajuste > 0 && (
        <p className="text-sm text-warning-soft-fg bg-warning-soft border border-warning-border rounded-[var(--radius-md)] px-2.5 py-1.5">
          Ajuste redondeo {formatARS(ajuste)} — queda en caja (sin monedas)
        </p>
      )}
    </div>
  )
}
