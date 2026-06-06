'use client'

import { useEffect, useState, useTransition } from 'react'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { PagoMultiMetodo, type PagoLinea } from './PagoMultiMetodo'
import { FacturaToggle } from './FacturaToggle'
import { ClienteSelector } from '@/components/clientes/ClienteSelector'
import type { ClienteLite } from '@/app/actions/ventas'
import type { MetodoPago } from '@/lib/configuracion/queries'

interface PanelPagoProps {
  metodos: MetodoPago[]
  subtotal: number
  descuento: number
  onDescuentoChange: (v: number) => void
  pagos: PagoLinea[]
  onPagosChange: (p: PagoLinea[]) => void
  clienteSeleccionado: ClienteLite | null
  onClienteChange: (c: ClienteLite | null) => void
  observaciones: string
  onObservacionesChange: (v: string) => void
  onCobrar: () => void
  isCobrando: boolean
  puedeCobrar: boolean
  error: string | null
  saldoFavorAplicado: number
  onSaldoFavorChange: (v: number) => void
  // Facturación electrónica
  facturacionActiva?: boolean
  emitirFactura?: boolean
  onEmitirFacturaChange?: (v: boolean) => void
  cuitReceptor?: string
  onCuitReceptorChange?: (v: string) => void
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

export function PanelPago({
  metodos,
  subtotal,
  descuento,
  onDescuentoChange,
  pagos,
  onPagosChange,
  clienteSeleccionado,
  onClienteChange,
  observaciones,
  onObservacionesChange,
  onCobrar,
  isCobrando,
  puedeCobrar,
  error,
  saldoFavorAplicado,
  onSaldoFavorChange,
  facturacionActiva = false,
  emitirFactura = false,
  onEmitirFacturaChange,
  cuitReceptor = '',
  onCuitReceptorChange,
}: PanelPagoProps) {
  const total = Math.max(0, Math.round((subtotal - descuento) * 100) / 100)
  const totalAPagar = Math.max(0, Math.round((total - saldoFavorAplicado) * 100) / 100)

  function aplicarSaldoCompleto() {
    const saldoDisponible = clienteSeleccionado?.saldo_favor ?? 0
    onSaldoFavorChange(Math.min(saldoDisponible, total))
  }

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)] lg:sticky lg:top-4">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-gray-900">Cobrar</h2>
        {subtotal > 0 && (
          <span className="text-[13px] font-bold text-lime-700 tabular-nums">{formatARS(totalAPagar)}</span>
        )}
      </div>

      <div className="divide-y divide-gray-50">

        {/* Sección 1 — Cliente */}
        <div className="px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.07em] font-semibold text-gray-400 mb-3">
            Cliente <span className="normal-case font-normal text-gray-300">(opcional)</span>
          </p>
          <ClienteSelector value={clienteSeleccionado} onChange={onClienteChange} />

          {clienteSeleccionado && clienteSeleccionado.saldo_favor > 0 && (
            <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-emerald-700">Saldo a favor</span>
                <span className="text-[13px] font-bold text-emerald-800 tabular-nums">
                  {formatARS(clienteSeleccionado.saldo_favor)}
                </span>
              </div>
              {saldoFavorAplicado > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-emerald-700">
                    Aplicado: <strong className="tabular-nums">{formatARS(saldoFavorAplicado)}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => onSaldoFavorChange(0)}
                    className="text-[11px] text-red-500 hover:text-red-700 font-medium underline"
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={aplicarSaldoCompleto}
                  className="w-full text-[12px] font-semibold text-emerald-700 border border-emerald-200 rounded-lg py-1.5 hover:bg-emerald-100 transition-colors"
                >
                  Aplicar saldo al cobro
                </button>
              )}
            </div>
          )}
        </div>

        {/* Sección 2 — Resumen */}
        <div className="px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.07em] font-semibold text-gray-400 mb-3">Resumen</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-gray-500">Subtotal</span>
              <span className="text-[13px] font-medium text-gray-700 tabular-nums">{formatARS(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <label className="text-[13px] text-gray-500" htmlFor="descuento_global">Descuento</label>
              <input
                id="descuento_global"
                type="number"
                min={0}
                step={0.01}
                value={descuento}
                onChange={(e) => onDescuentoChange(Math.max(0, Number(e.target.value) || 0))}
                className="w-28 h-8 px-2 border border-gray-200 rounded-lg text-[13px] text-right focus:ring-2 focus:ring-lime-400/60 focus:border-lime-400 tabular-nums"
              />
            </div>
            {saldoFavorAplicado > 0 && (
              <div className="flex justify-between items-center text-emerald-700">
                <span className="text-[13px]">Saldo a favor</span>
                <span className="text-[13px] font-medium tabular-nums">− {formatARS(saldoFavorAplicado)}</span>
              </div>
            )}
            {(descuento > 0 || saldoFavorAplicado > 0) && (
              <div className="border-t border-gray-50 pt-2" />
            )}
          </div>
          {/* Total destacado */}
          <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-gray-600">Total a pagar</span>
            <span className="text-[28px] font-black text-gray-900 tabular-nums leading-none">
              {formatARS(totalAPagar)}
            </span>
          </div>
        </div>

        {/* Sección 3 — Método de pago */}
        <div className="px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.07em] font-semibold text-gray-400 mb-3">Forma de pago</p>
          <PagoMultiMetodo
            metodos={metodos}
            pagos={pagos}
            total={totalAPagar}
            onChange={onPagosChange}
          />
        </div>

        {/* Sección 4 — Observaciones */}
        <div className="px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.07em] font-semibold text-gray-400 mb-3">Observaciones</p>
          <Textarea
            rows={2}
            value={observaciones}
            onChange={(e) => onObservacionesChange(e.target.value)}
            placeholder="Notas adicionales (opcional)…"
          />
        </div>

        {/* Sección 5 — Facturación (condicional) */}
        {facturacionActiva && onEmitirFacturaChange && onCuitReceptorChange && (
          <div className="px-5 py-4">
            <FacturaToggle
              emitirFactura={emitirFactura}
              onEmitirFacturaChange={onEmitirFacturaChange}
              cuitReceptor={cuitReceptor}
              onCuitReceptorChange={onCuitReceptorChange}
            />
          </div>
        )}

        {/* Error + CTA */}
        <div className="px-5 py-4 space-y-3">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-800">
              {error}
            </div>
          )}
          <Button
            type="button"
            onClick={onCobrar}
            disabled={!puedeCobrar || isCobrando}
            className="w-full !bg-[#0A0A0A] hover:!bg-gray-800 !rounded-full !h-12 !border-transparent !text-[15px] !font-bold"
          >
            {isCobrando ? 'Cobrando…' : `Cobrar ${formatARS(totalAPagar)}`}
          </Button>
        </div>

      </div>
    </div>
  )
}

