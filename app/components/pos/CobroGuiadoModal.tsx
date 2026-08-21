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
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'

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
  redondeoEfectivoActivo?: boolean
  esCuentaCorriente?: boolean
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
  redondeoEfectivoActivo = true,
  esCuentaCorriente = false,
}: CobroGuiadoModalProps) {
  const ctx: CobroGuiadoContext = {
    subtotal,
    descuento,
    saldoFavorAplicado,
    pagos,
    cliente,
    metodos,
    esCuentaCorriente,
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

  // Enter avanza / confirma. Escape lo maneja Modal.
  useEffect(() => {
    if (!open) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Enter' || e.shiftKey) return
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

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, paso, avanzar, onConfirmar])

  const puedeAvanzar = pasoValido(paso, ctx)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={esCuentaCorriente ? 'Confirmar pedido' : 'Cobrar venta'}
      size="full"
      className="sm:min-h-[min(70vh,720px)]"
      footer={
        paso !== 'confirmacion' ? (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={retroceder}
              disabled={paso === 'pago'}
            >
              Atrás
            </Button>
            <Button type="button" onClick={avanzar} disabled={!puedeAvanzar}>
              Siguiente
            </Button>
          </>
        ) : undefined
      }
    >
      <nav className="flex flex-wrap gap-2 sm:gap-4 mb-6" aria-label="Pasos del cobro">
        {PASOS_ORDEN.map((p, i) => {
          const activo = p === paso
          const completado = PASOS_ORDEN.indexOf(paso) > i
          return (
            <div
              key={p}
              className={cn(
                'flex items-center gap-2 text-sm font-semibold',
                activo ? 'text-fg-brand' : completado ? 'text-fg-muted' : 'text-fg-subtle'
              )}
            >
              <span
                className={cn(
                  'h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold',
                  activo
                    ? 'bg-primary text-primary-fg'
                    : completado
                      ? 'bg-surface-sunken text-fg-muted'
                      : 'bg-surface-sunken text-fg-subtle'
                )}
              >
                {i + 1}
              </span>
              <span className="hidden sm:inline">{PASO_LABELS[p]}</span>
            </div>
          )
        })}
      </nav>

      <div className={paso === 'cliente' ? 'overflow-visible' : undefined}>
        {paso === 'pago' && (
          <PasoPago
            metodos={metodos}
            totalAPagar={total}
            pagos={pagos}
            onPagosChange={onPagosChange}
            onSiguiente={avanzar}
            redondeoEfectivoActivo={redondeoEfectivoActivo}
            esCuentaCorriente={esCuentaCorriente}
          />
        )}
        {paso === 'cliente' && (
          <PasoCliente
            cliente={cliente}
            onClienteChange={onClienteChange}
            saldoFavorAplicado={saldoFavorAplicado}
            onSaldoFavorChange={onSaldoFavorChange}
            totalBruto={totalBruto}
            esCuentaCorriente={esCuentaCorriente}
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
    </Modal>
  )
}
