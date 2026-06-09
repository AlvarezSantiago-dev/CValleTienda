'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { PagoMultiMetodo, type PagoLinea } from './PagoMultiMetodo'
import { PagoRapidoChips } from './PagoRapidoChips'
import { FacturaToggle } from './FacturaToggle'
import { ClienteSelector } from '@/components/clientes/ClienteSelector'
import type { ClienteLite } from '@/app/actions/ventas'
import type { MetodoPago } from '@/lib/configuracion/queries'
import { descuentoDesdePorcentaje, porcentajeEfectivo } from '@/lib/pos/descuento'

type SeccionToolbar = 'cliente' | 'descuento' | 'factura' | 'notas'

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

function parsePorcentajeInput(raw: string): number | null {
  const pct = Number(raw.replace(',', '.').trim())
  if (!Number.isFinite(pct) || pct <= 0) return null
  return pct
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
  const [seccionAbierta, setSeccionAbierta] = useState<SeccionToolbar | null>(null)
  const [pctCustom, setPctCustom] = useState('')

  const total = Math.max(0, Math.round((subtotal - descuento) * 100) / 100)
  const totalAPagar = Math.max(0, Math.round((total - saldoFavorAplicado) * 100) / 100)
  const pctPreview = parsePorcentajeInput(pctCustom)
  const pctEfectivo = porcentajeEfectivo(subtotal, descuento)

  function toggleSeccion(seccion: SeccionToolbar) {
    setSeccionAbierta((prev) => (prev === seccion ? null : seccion))
  }

  function aplicarPorcentajeCustom() {
    const pct = parsePorcentajeInput(pctCustom)
    if (pct == null) return
    onDescuentoChange(descuentoDesdePorcentaje(subtotal, pct))
  }

  function aplicarPreset(pct: number) {
    setPctCustom(String(pct))
    onDescuentoChange(descuentoDesdePorcentaje(subtotal, pct))
  }

  function aplicarSaldoCompleto() {
    const saldoDisponible = clienteSeleccionado?.saldo_favor ?? 0
    onSaldoFavorChange(Math.min(saldoDisponible, total))
  }

  const chips: { id: SeccionToolbar; label: string; badge?: string }[] = [
    {
      id: 'cliente',
      label: 'Cliente',
      badge: clienteSeleccionado
        ? `${clienteSeleccionado.nombre}${clienteSeleccionado.apellido ? ` ${clienteSeleccionado.apellido}` : ''}`.trim()
        : undefined,
    },
    {
      id: 'descuento',
      label: 'Descuento',
      badge: descuento > 0 ? formatARS(descuento) : undefined,
    },
    ...(facturacionActiva ? [{ id: 'factura' as const, label: 'Factura', badge: emitirFactura ? 'Sí' : undefined }] : []),
    {
      id: 'notas',
      label: 'Notas',
      badge: observaciones.trim() ? '✓' : undefined,
    },
  ]

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)] lg:sticky lg:top-4">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-gray-900">Cobrar</h2>
        {subtotal > 0 && (
          <span className="text-[13px] font-bold text-lime-700 tabular-nums lg:hidden">
            {formatARS(totalAPagar)}
          </span>
        )}
      </div>

      <div className="px-5 py-3 border-b border-gray-50">
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => {
            const activo = seccionAbierta === chip.id
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => toggleSeccion(chip.id)}
                className={[
                  'min-h-[36px] px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors inline-flex items-center gap-1.5',
                  activo
                    ? 'bg-lime-50 text-lime-900 border-2 border-lime-400'
                    : chip.badge
                      ? 'bg-gray-50 text-gray-800 border border-gray-200 hover:bg-gray-100'
                      : 'bg-gray-100 text-gray-700 border border-transparent hover:bg-gray-200',
                ].join(' ')}
              >
                <span>{chip.label}</span>
                {chip.badge && !activo && (
                  <span className="text-[10px] font-bold text-lime-700 max-w-[80px] truncate">
                    {chip.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {seccionAbierta === 'cliente' && (
        <div className="px-5 py-4 border-b border-gray-50 bg-lime-50/30">
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
      )}

      {seccionAbierta === 'descuento' && (
        <div className="px-5 py-4 border-b border-gray-50 bg-lime-50/30 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-gray-600">Subtotal</span>
            <span className="text-[13px] font-medium text-gray-700 tabular-nums">{formatARS(subtotal)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[5, 10, 15].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => aplicarPreset(pct)}
                className="min-h-[36px] px-3 rounded-lg text-[12px] font-semibold bg-gray-100 hover:bg-lime-100 text-gray-800 transition-colors"
              >
                {pct}%
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setPctCustom('')
                onDescuentoChange(0)
              }}
              className="min-h-[36px] px-3 rounded-lg text-[12px] font-semibold text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Quitar
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="descuento_pct" className="text-[13px] text-gray-600 shrink-0">
              Porcentaje
            </label>
            <input
              id="descuento_pct"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={pctCustom}
              onChange={(e) => setPctCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  aplicarPorcentajeCustom()
                }
              }}
              placeholder="Ej. 7.5"
              className="w-24 h-9 px-2 border border-gray-200 rounded-lg text-[13px] text-right focus:ring-2 focus:ring-lime-400/60 focus:border-lime-400 tabular-nums"
            />
            <span className="text-[13px] text-gray-500">%</span>
            <button
              type="button"
              onClick={aplicarPorcentajeCustom}
              className="min-h-[36px] px-3 rounded-lg text-[12px] font-semibold bg-lime-500 text-[#0A0A0A] hover:bg-lime-400 transition-colors"
            >
              Aplicar
            </button>
          </div>
          {pctPreview != null && (
            <p className="text-[11px] text-gray-500">
              ≈ {formatARS(descuentoDesdePorcentaje(subtotal, pctPreview))} de descuento
            </p>
          )}
          <div className="flex justify-between items-center gap-3">
            <label className="text-[13px] text-gray-600 shrink-0" htmlFor="descuento_global">
              Monto fijo
            </label>
            <input
              id="descuento_global"
              type="number"
              min={0}
              step={0.01}
              value={descuento}
              onChange={(e) => onDescuentoChange(Math.max(0, Number(e.target.value) || 0))}
              className="w-32 h-9 px-2 border border-gray-200 rounded-lg text-[13px] text-right focus:ring-2 focus:ring-lime-400/60 focus:border-lime-400 tabular-nums"
            />
          </div>
        </div>
      )}

      {seccionAbierta === 'factura' && facturacionActiva && onEmitirFacturaChange && onCuitReceptorChange && (
        <div className="px-5 py-4 border-b border-gray-50 bg-lime-50/30">
          <FacturaToggle
            emitirFactura={emitirFactura}
            onEmitirFacturaChange={onEmitirFacturaChange}
            cuitReceptor={cuitReceptor}
            onCuitReceptorChange={onCuitReceptorChange}
          />
        </div>
      )}

      {seccionAbierta === 'notas' && (
        <div className="px-5 py-4 border-b border-gray-50 bg-lime-50/30">
          <Textarea
            rows={2}
            value={observaciones}
            onChange={(e) => onObservacionesChange(e.target.value)}
            placeholder="Notas adicionales (opcional)…"
          />
        </div>
      )}

      <div className="px-5 py-4 border-b border-gray-50">
        <div className="space-y-1.5 mb-3">
          {descuento > 0 && (
            <div className="flex justify-between items-center text-[12px] text-gray-500">
              <span>
                Descuento
                {pctEfectivo != null && (
                  <span className="text-[11px] text-gray-400 ml-1">({pctEfectivo}%)</span>
                )}
              </span>
              <span className="tabular-nums text-amber-700">− {formatARS(descuento)}</span>
            </div>
          )}
          {saldoFavorAplicado > 0 && (
            <div className="flex justify-between items-center text-[12px] text-emerald-700">
              <span>Saldo a favor</span>
              <span className="tabular-nums">− {formatARS(saldoFavorAplicado)}</span>
            </div>
          )}
        </div>
        <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-gray-600">Total a pagar</span>
          <span className="text-[28px] font-black text-gray-900 tabular-nums leading-none">
            {formatARS(totalAPagar)}
          </span>
        </div>
      </div>

      <div className="px-5 py-4 border-b border-gray-50">
        <p className="text-[11px] uppercase tracking-[0.07em] font-semibold text-gray-400 mb-3">Forma de pago</p>
        <PagoRapidoChips
          metodos={metodos}
          total={totalAPagar}
          pagos={pagos}
          onChange={onPagosChange}
        />
        <PagoMultiMetodo
          metodos={metodos}
          pagos={pagos}
          total={totalAPagar}
          onChange={onPagosChange}
          onCobrar={onCobrar}
        />
      </div>

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
          className="w-full !bg-[#0A0A0A] hover:!bg-gray-800 !rounded-full !h-12 !border-transparent !text-[15px] !font-bold hidden lg:flex"
        >
          {isCobrando ? 'Cobrando…' : `Cobrar ${formatARS(totalAPagar)}`}
        </Button>
        <p className="hidden lg:block text-center text-[11px] text-gray-400">
          Efectivo: F2 carga el pago → ingresá monto → Enter o F2 · ? para ayuda
        </p>
      </div>
    </div>
  )
}
