'use client'

import { useState } from 'react'
import type { MetodoPago } from '@/lib/configuracion/queries'
import type { PagoLinea } from '../PagoMultiMetodo'
import type { ClienteLite } from '@/app/actions/ventas'
import { FacturaToggle } from '../FacturaToggle'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { formatARS } from '@/lib/format'
import { pagosInsuficientes, type CobroGuiadoContext } from '@/lib/pos/cobro-guiado-steps'

interface PasoConfirmacionProps {
  ctx: CobroGuiadoContext & { itemsCount: number }
  metodos: MetodoPago[]
  facturacionActiva: boolean
  emitirFactura: boolean
  onEmitirFacturaChange: (v: boolean) => void
  cuitReceptor: string
  onCuitReceptorChange: (v: string) => void
  observaciones: string
  onObservacionesChange: (v: string) => void
  onConfirmar: () => void
  onVolverPago: () => void
  isCobrando: boolean
  error: string | null
}

export function PasoConfirmacion({
  ctx,
  metodos,
  facturacionActiva,
  emitirFactura,
  onEmitirFacturaChange,
  cuitReceptor,
  onCuitReceptorChange,
  observaciones,
  onObservacionesChange,
  onConfirmar,
  onVolverPago,
  isCobrando,
  error,
}: PasoConfirmacionProps) {
  const [mostrarExtras, setMostrarExtras] = useState(false)
  const insuficiente = !ctx.esCuentaCorriente && pagosInsuficientes(ctx)
  const suma = ctx.pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0)
  const aCuenta = ctx.esCuentaCorriente
    ? Math.max(0, Math.round((ctx.subtotal - ctx.descuento - ctx.saldoFavorAplicado - suma) * 100) / 100)
    : 0
  const total = Math.max(
    0,
    Math.round((ctx.subtotal - ctx.descuento - ctx.saldoFavorAplicado) * 100) / 100
  )

  const nombreCliente = ctx.cliente
    ? `${ctx.cliente.nombre}${ctx.cliente.apellido ? ` ${ctx.cliente.apellido}` : ''}`.trim()
    : 'Consumidor final'

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900">Confirmar venta</h3>
        <p className="text-sm text-gray-500 mt-2">Revisá el resumen antes de cobrar</p>
      </div>

      {insuficiente && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Los pagos no cubren el total.{' '}
          <button
            type="button"
            onClick={onVolverPago}
            className="font-semibold underline hover:text-amber-700"
          >
            Volver al paso de pago
          </button>
        </div>
      )}

      <ul className="space-y-3 max-w-md mx-auto">
        <li className="flex justify-between text-base">
          <span className="text-gray-600">Productos</span>
          <span className="font-semibold">{ctx.itemsCount}</span>
        </li>
        <li className="flex justify-between text-base">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-semibold tabular-nums">{formatARS(ctx.subtotal)}</span>
        </li>
        {ctx.descuento > 0 && (
          <li className="flex justify-between text-base text-amber-700">
            <span>Descuento</span>
            <span className="font-semibold tabular-nums">− {formatARS(ctx.descuento)}</span>
          </li>
        )}
        {ctx.saldoFavorAplicado > 0 && (
          <li className="flex justify-between text-base text-emerald-700">
            <span>Saldo a favor</span>
            <span className="font-semibold tabular-nums">− {formatARS(ctx.saldoFavorAplicado)}</span>
          </li>
        )}
        <li className="flex justify-between text-base">
          <span className="text-gray-600">Cliente</span>
          <span className="font-semibold text-right max-w-[60%] truncate">{nombreCliente}</span>
        </li>
        {aCuenta > 0.01 && (
          <li className="flex justify-between text-base text-fg-brand">
            <span>A cuenta</span>
            <span className="font-semibold tabular-nums">{formatARS(aCuenta)}</span>
          </li>
        )}
        {ctx.pagos.map((p) => {
          const m = metodos.find((x) => x.id === p.metodo_pago_id)
          return (
            <li key={p.id} className="flex justify-between text-base">
              <span className="text-gray-600">{m?.nombre ?? 'Pago'}</span>
              <span className="font-semibold tabular-nums">{formatARS(Number(p.monto))}</span>
            </li>
          )
        })}
        <li className="flex justify-between text-xl font-black border-t border-gray-200 pt-3 mt-2">
          <span>Total</span>
          <span className="tabular-nums">{formatARS(total)}</span>
        </li>
      </ul>

      {ctx.saldoFavorAplicado > 0 && (
        <p className="max-w-md mx-auto text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-center">
          {formatARS(ctx.saldoFavorAplicado)} se cubren con el crédito del cliente.
          Esa parte no ingresa a la caja: solo se cobra el resto.
        </p>
      )}

      <button
        type="button"
        onClick={() => setMostrarExtras((v) => !v)}
        className="block mx-auto text-sm text-gray-500 hover:text-gray-800 underline"
      >
        {mostrarExtras ? 'Ocultar opciones' : 'Factura y notas (opcional)'}
      </button>

      {mostrarExtras && (
        <div className="max-w-md mx-auto space-y-4">
          {facturacionActiva && (
            <FacturaToggle
              emitirFactura={emitirFactura}
              onEmitirFacturaChange={onEmitirFacturaChange}
              cuitReceptor={cuitReceptor}
              onCuitReceptorChange={onCuitReceptorChange}
            />
          )}
          <Textarea
            rows={2}
            value={observaciones}
            onChange={(e) => onObservacionesChange(e.target.value)}
            placeholder="Notas adicionales (opcional)…"
          />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 max-w-md mx-auto">
          {error}
        </div>
      )}

      <Button
        type="button"
        onClick={onConfirmar}
        disabled={insuficiente || isCobrando}
        className="w-full max-w-md mx-auto flex !bg-fg hover:!bg-gray-800 !rounded-full !h-14 !border-transparent !text-lg !font-bold"
      >
        {isCobrando
          ? 'Confirmando…'
          : ctx.esCuentaCorriente
            ? `Confirmar ${formatARS(total)}`
            : `Cobrar ${formatARS(total)}`}
      </Button>
    </div>
  )
}
