'use client'

import { useEffect, useCallback } from 'react'
import type { MetodoPago } from '@/lib/configuracion/queries'
import type { PagoLinea } from './PagoMultiMetodo'
import type { ClienteLite } from '@/app/actions/ventas'
import {
  type PasoCobroGuiado,
  type CobroGuiadoContext,
  PASOS_ORDEN,
  PASO_LABELS,
  pasoValido,
  siguientePaso,
  anteriorPaso,
  totalAPagar,
} from '@/lib/pos/cobro-guiado-steps'
import { PasoPago } from './cobro-guiado/PasoPago'
import { PasoCliente } from './cobro-guiado/PasoCliente'
import { PasoDescuento } from './cobro-guiado/PasoDescuento'
import { PasoConfirmacion } from './cobro-guiado/PasoConfirmacion'

interface CobroGuiadoModalProps {
  open: boolean
  onClose: () => void
  paso: PasoCobroGuiado
  onPasoChange: (p: PasoCobroGuiado) => void
  subtotal: number
  descuento: number
  saldoFavorAplicado: number
  pagos: PagoLinea[]
  cliente: ClienteLite | null
  itemsCount: number
  metodos: MetodoPago[]
  facturacionActiva: boolean
  emitirFactura: boolean
  onEmitirFacturaChange: (v: boolean) => void
  cuitReceptor: string
  onCuitReceptorChange: (v: string) => void
  observaciones: string
  onObservacionesChange: (v: string) => void
  onPagosChange: (p: PagoLinea[]) => void
  onClienteChange: (c: ClienteLite | null) => void
  onDescuentoChange: (v: number) => void
  onSaldoFavorChange: (v: number) => void
  onConfirmar: () => void
  isCobrando: boolean
  error: string | null
}

export function CobroGuiadoModal({
  open,
  onClose,
  paso,
  onPasoChange,
  subtotal,
  descuento,
  saldoFavorAplicado,
  pagos,
  cliente,
  itemsCount,
  metodos,
  facturacionActiva,
  emitirFactura,
  onEmitirFacturaChange,
  cuitReceptor,
  onCuitReceptorChange,
  observaciones,
  onObservacionesChange,
  onPagosChange,
  onClienteChange,
  onDescuentoChange,
  onSaldoFavorChange,
  onConfirmar,
  isCobrando,
  error,
}: CobroGuiadoModalProps) {
  const ctx: CobroGuiadoContext = {
    subtotal,
    descuento,
    saldoFavorAplicado,
    pagos,
    cliente,
    metodos,
  }

  const total = totalAPagar(ctx)
  const totalBruto = Math.max(0, Math.round((subtotal - descuento) * 100) / 100)

  const avanzar = useCallback(() => {
    if (!pasoValido(paso, ctx)) return
    const next = siguientePaso(paso)
    if (next) onPasoChange(next)
    else if (paso === 'confirmacion') onConfirmar()
  }, [paso, ctx, onPasoChange, onConfirmar])

  const retroceder = useCallback(() => {
    const prev = anteriorPaso(paso)
    if (prev) onPasoChange(prev)
  }, [paso, onPasoChange])

  useEffect(() => {
    if (!open) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        const t = e.target as HTMLElement
        if (t.tagName === 'TEXTAREA') return
        if (t.tagName === 'INPUT' && paso === 'pago') {
          const input = t as HTMLInputElement
          if (input.dataset.pagoMonto !== undefined) {
            e.preventDefault()
            avanzar()
            return
          }
        }
        if (t.tagName === 'INPUT' || t.tagName === 'SELECT') return
        e.preventDefault()
        if (paso === 'confirmacion') onConfirmar()
        else avanzar()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, paso, avanzar, onConfirmar, onClose])

  if (!open) return null

  const puedeAvanzar = pasoValido(paso, ctx)
  const esUltimo = paso === 'confirmacion'

  return (
    <div
      className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cobro-guiado-title"
    >
      <div
        className="bg-white w-full sm:max-w-4xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[100dvh] sm:max-h-[90vh] min-h-[70vh] sm:min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 sm:px-8 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 id="cobro-guiado-title" className="text-lg font-bold text-gray-900">
              Cobrar venta
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-1"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
          <nav className="flex flex-wrap gap-2 sm:gap-4" aria-label="Pasos del cobro">
            {PASOS_ORDEN.map((p, i) => {
              const activo = p === paso
              const completado = PASOS_ORDEN.indexOf(paso) > i
              return (
                <div
                  key={p}
                  className={[
                    'flex items-center gap-2 text-sm font-semibold',
                    activo ? 'text-lime-700' : completado ? 'text-gray-600' : 'text-gray-400',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold',
                      activo
                        ? 'bg-lime-500 text-[#0A0A0A]'
                        : completado
                          ? 'bg-gray-200 text-gray-700'
                          : 'bg-gray-100 text-gray-400',
                    ].join(' ')}
                  >
                    {i + 1}
                  </span>
                  <span className="hidden sm:inline">{PASO_LABELS[p]}</span>
                </div>
              )
            })}
          </nav>
        </div>

        <div className={`flex-1 px-5 sm:px-8 py-6 ${paso === 'cliente' ? 'overflow-visible' : 'overflow-y-auto'}`}>
          {paso === 'pago' && (
            <PasoPago
              metodos={metodos}
              totalAPagar={total}
              pagos={pagos}
              onPagosChange={onPagosChange}
              onSiguiente={avanzar}
            />
          )}
          {paso === 'cliente' && (
            <PasoCliente
              cliente={cliente}
              onClienteChange={onClienteChange}
              saldoFavorAplicado={saldoFavorAplicado}
              onSaldoFavorChange={onSaldoFavorChange}
              totalBruto={totalBruto}
            />
          )}
          {paso === 'descuento' && (
            <PasoDescuento
              subtotal={subtotal}
              descuento={descuento}
              onDescuentoChange={onDescuentoChange}
            />
          )}
          {paso === 'confirmacion' && (
            <PasoConfirmacion
              ctx={{ ...ctx, itemsCount }}
              metodos={metodos}
              facturacionActiva={facturacionActiva}
              emitirFactura={emitirFactura}
              onEmitirFacturaChange={onEmitirFacturaChange}
              cuitReceptor={cuitReceptor}
              onCuitReceptorChange={onCuitReceptorChange}
              observaciones={observaciones}
              onObservacionesChange={onObservacionesChange}
              onConfirmar={onConfirmar}
              onVolverPago={() => onPasoChange('pago')}
              isCobrando={isCobrando}
              error={error}
            />
          )}
        </div>

        {paso !== 'confirmacion' && (
          <div className="px-5 sm:px-8 py-4 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={retroceder}
              disabled={paso === 'pago'}
              className="min-h-[48px] px-5 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Atrás
            </button>
            <button
              type="button"
              onClick={avanzar}
              disabled={!puedeAvanzar}
              className="min-h-[48px] px-8 rounded-full text-sm font-bold bg-[#0A0A0A] text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Siguiente →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
