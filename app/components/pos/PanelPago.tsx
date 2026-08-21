'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { FacturaToggle } from './FacturaToggle'
import { ClienteSelector } from '@/components/clientes/ClienteSelector'
import { DescuentoEditor } from './DescuentoEditor'
import type { ClienteLite } from '@/app/actions/ventas'
import { porcentajeEfectivo } from '@/lib/pos/descuento'

type SeccionToolbar = 'cliente' | 'descuento' | 'factura' | 'notas'

interface PanelPagoProps {
  subtotal: number
  descuento: number
  onDescuentoChange: (v: number) => void
  clienteSeleccionado: ClienteLite | null
  onClienteChange: (c: ClienteLite | null) => void
  observaciones: string
  onObservacionesChange: (v: string) => void
  onCobrar: () => void
  isCobrando: boolean
  puedeAbrirCobro: boolean
  error: string | null
  saldoFavorAplicado: number
  onSaldoFavorChange: (v: number) => void
  facturacionActiva?: boolean
  emitirFactura?: boolean
  onEmitirFacturaChange?: (v: boolean) => void
  cuitReceptor?: string
  onCuitReceptorChange?: (v: string) => void
  esCuentaCorriente?: boolean
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

export function PanelPago({
  subtotal,
  descuento,
  onDescuentoChange,
  clienteSeleccionado,
  onClienteChange,
  observaciones,
  onObservacionesChange,
  onCobrar,
  isCobrando,
  puedeAbrirCobro,
  error,
  saldoFavorAplicado,
  onSaldoFavorChange,
  facturacionActiva = false,
  emitirFactura = false,
  onEmitirFacturaChange,
  cuitReceptor = '',
  onCuitReceptorChange,
  esCuentaCorriente = false,
}: PanelPagoProps) {
  const [seccionAbierta, setSeccionAbierta] = useState<SeccionToolbar | null>(null)

  const total = Math.max(0, Math.round((subtotal - descuento) * 100) / 100)
  const totalAPagar = Math.max(0, Math.round((total - saldoFavorAplicado) * 100) / 100)
  const pctEfectivo = porcentajeEfectivo(subtotal, descuento)

  function toggleSeccion(seccion: SeccionToolbar) {
    setSeccionAbierta((prev) => (prev === seccion ? null : seccion))
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
    <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden shadow-xs lg:sticky lg:top-4">
      <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-fg">Cobrar</h2>
        {subtotal > 0 && (
          <span className="text-[13px] font-bold text-fg-brand font-mono tabular-nums lg:hidden">
            {formatARS(totalAPagar)}
          </span>
        )}
      </div>

      <div className="px-5 py-3 border-b border-border-subtle">
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
                    ? 'bg-primary-soft text-fg-brand border-2 border-primary'
                    : chip.badge
                      ? 'bg-surface-sunken text-fg border border-border-default hover:bg-surface-hover'
                      : 'bg-surface-sunken text-fg-muted border border-transparent hover:bg-surface-hover',
                ].join(' ')}
              >
                <span>{chip.label}</span>
                {chip.badge && !activo && (
                  <span className="text-[10px] font-bold text-fg-brand max-w-[80px] truncate">
                    {chip.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {seccionAbierta === 'cliente' && (
        <div className="px-5 py-4 border-b border-border-subtle bg-primary-soft/30">
          <ClienteSelector value={clienteSeleccionado} onChange={onClienteChange} />
          {clienteSeleccionado && clienteSeleccionado.saldo_favor > 0 && (
            <div className="mt-3 bg-success-soft border border-success-border rounded-lg px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-success-soft-fg">Saldo a favor</span>
                <span className="text-[13px] font-bold text-success-soft-fg tabular-nums">
                  {formatARS(clienteSeleccionado.saldo_favor)}
                </span>
              </div>
              {saldoFavorAplicado > 0 ? (
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-success-soft-fg">
                    Aplicado: <strong className="tabular-nums">{formatARS(saldoFavorAplicado)}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => onSaldoFavorChange(0)}
                    className="text-[11px] text-danger hover:text-danger-hover font-medium underline"
                  >
                    Quitar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={aplicarSaldoCompleto}
                  className="w-full text-[12px] font-semibold text-success-soft-fg border border-success-border rounded-lg py-1.5 hover:bg-success-soft transition-colors"
                >
                  Aplicar saldo al cobro
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {seccionAbierta === 'descuento' && (
        <div className="px-5 py-4 border-b border-border-subtle bg-primary-soft/30 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-[13px] text-fg-muted">Subtotal</span>
            <span className="text-[13px] font-medium text-fg tabular-nums">{formatARS(subtotal)}</span>
          </div>
          <DescuentoEditor
            subtotal={subtotal}
            descuento={descuento}
            onDescuentoChange={onDescuentoChange}
            size="default"
          />
        </div>
      )}

      {seccionAbierta === 'factura' && facturacionActiva && onEmitirFacturaChange && onCuitReceptorChange && (
        <div className="px-5 py-4 border-b border-border-subtle bg-primary-soft/30">
          <FacturaToggle
            emitirFactura={emitirFactura}
            onEmitirFacturaChange={onEmitirFacturaChange}
            cuitReceptor={cuitReceptor}
            onCuitReceptorChange={onCuitReceptorChange}
          />
        </div>
      )}

      {seccionAbierta === 'notas' && (
        <div className="px-5 py-4 border-b border-border-subtle bg-primary-soft/30">
          <Textarea
            rows={2}
            value={observaciones}
            onChange={(e) => onObservacionesChange(e.target.value)}
            placeholder="Notas adicionales (opcional)…"
          />
        </div>
      )}

      <div className="px-5 py-4 border-b border-border-subtle">
        <div className="space-y-1.5 mb-3">
          {descuento > 0 && (
            <div className="flex justify-between items-center text-[12px] text-fg-muted">
              <span>
                Descuento
                {pctEfectivo != null && (
                  <span className="text-[11px] text-fg-subtle ml-1">({pctEfectivo}%)</span>
                )}
              </span>
              <span className="tabular-nums text-warning-soft-fg">− {formatARS(descuento)}</span>
            </div>
          )}
          {saldoFavorAplicado > 0 && (
            <div className="flex justify-between items-center text-[12px] text-success-soft-fg">
              <span>Saldo a favor</span>
              <span className="tabular-nums">− {formatARS(saldoFavorAplicado)}</span>
            </div>
          )}
        </div>
        <div className="bg-surface-sunken rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-[13px] font-semibold text-fg-muted shrink-0">Total a pagar</span>
          <span className="text-[28px] font-black text-fg tabular-nums leading-none text-right min-w-0">
            {formatARS(totalAPagar)}
          </span>
        </div>
      </div>

      <div className="px-5 py-4 space-y-3">
        {error && (
          <div className="rounded-[var(--radius-md)] border border-danger-border bg-danger-soft px-3 py-2.5 text-sm text-danger-soft-fg">
            {error}
          </div>
        )}
        <Button
          type="button"
          onClick={onCobrar}
          disabled={!puedeAbrirCobro || isCobrando}
          size="lg"
          className="w-full hidden lg:flex"
        >
          {isCobrando
            ? 'Confirmando…'
            : esCuentaCorriente
              ? `Confirmar a cuenta ${formatARS(totalAPagar)}`
              : `Cobrar ${formatARS(totalAPagar)}`}
        </Button>
        <p className="hidden lg:block text-center text-xs text-fg-subtle">
          F2 abre el cobro · ? para ayuda
        </p>
      </div>
    </div>
  )
}
