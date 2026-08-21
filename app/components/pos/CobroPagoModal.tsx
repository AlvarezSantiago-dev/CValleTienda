'use client'

import { useEffect, useRef } from 'react'
import type { MetodoPago } from '@/lib/configuracion/queries'
import type { ClienteLite } from '@/app/actions/ventas'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { formatARS } from '@/lib/format'
import {
  aplicarPagoRapido,
  esMetodoEfectivo,
  focusPrimerMontoPago,
  metodoPorDefecto,
} from '@/lib/pos/pago-rapido'
import { CobroMontosForm } from './CobroMontosForm'
import type { PagoLinea } from './PagoMultiMetodo'

interface CobroPagoModalProps {
  open: boolean
  onClose: () => void
  metodos: MetodoPago[]
  totalAPagar: number
  pagos: PagoLinea[]
  onPagosChange: (p: PagoLinea[]) => void
  cliente: ClienteLite | null
  onConfirmar: (pagosOverride?: PagoLinea[]) => void
  isCobrando: boolean
  puedeCobrar: boolean
  error: string | null
  redondeoEfectivoActivo?: boolean
  esCuentaCorriente?: boolean
}

function nombreCliente(cliente: ClienteLite | null): string | null {
  if (!cliente) return null
  return `${cliente.nombre}${cliente.apellido ? ` ${cliente.apellido}` : ''}`.trim()
}

export function CobroPagoModal({
  open,
  onClose,
  metodos,
  totalAPagar,
  pagos,
  onPagosChange,
  cliente,
  onConfirmar,
  isCobrando,
  puedeCobrar,
  error,
  redondeoEfectivoActivo = true,
  esCuentaCorriente = false,
}: CobroPagoModalProps) {
  const onPagosChangeRef = useRef(onPagosChange)
  onPagosChangeRef.current = onPagosChange
  const pagosRef = useRef(pagos)
  pagosRef.current = pagos
  const seedArgsRef = useRef({ totalAPagar, esCuentaCorriente, metodos, redondeoEfectivoActivo })
  seedArgsRef.current = { totalAPagar, esCuentaCorriente, metodos, redondeoEfectivoActivo }

  useEffect(() => {
    if (!open) return

    const { totalAPagar: total, esCuentaCorriente: cc, metodos: mets, redondeoEfectivoActivo: redondeo } =
      seedArgsRef.current

    if (pagosRef.current.length === 0 && total > 0 && !cc) {
      const m = metodoPorDefecto(mets)
      if (m && esMetodoEfectivo(m)) {
        onPagosChangeRef.current(
          aplicarPagoRapido(m.id, total, {
            esEfectivo: true,
            redondeoActivo: redondeo,
          })
        )
      }
    }

    const id = window.setTimeout(() => focusPrimerMontoPago(), 50)
    return () => window.clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (!open) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'F2' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault()
        if (puedeCobrar && !isCobrando) onConfirmar()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, puedeCobrar, isCobrando, onConfirmar])

  function confirmarSiPuede() {
    if (!puedeCobrar || isCobrando) return
    onConfirmar()
  }

  function sinSena() {
    if (isCobrando || !cliente) return
    onPagosChange([])
    onConfirmar([])
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={esCuentaCorriente ? 'Confirmar pedido' : 'Cobrar venta'}
      size="xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isCobrando}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={confirmarSiPuede}
            disabled={!puedeCobrar || isCobrando}
            isLoading={isCobrando}
          >
            {isCobrando
              ? 'Confirmando…'
              : esCuentaCorriente
                ? `Confirmar a cuenta ${formatARS(totalAPagar)}`
                : `Cobrar ${formatARS(totalAPagar)}`}
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-danger-border bg-danger-soft px-3 py-2.5 text-sm text-danger-soft-fg">
          {error}
        </div>
      )}
      <CobroMontosForm
        metodos={metodos}
        totalAPagar={totalAPagar}
        pagos={pagos}
        onPagosChange={onPagosChange}
        onConfirmarMonto={confirmarSiPuede}
        redondeoEfectivoActivo={redondeoEfectivoActivo}
        esCuentaCorriente={esCuentaCorriente}
        onSinSena={sinSena}
        clienteNombre={nombreCliente(cliente)}
        sinSenaDisabled={!cliente || isCobrando}
      />
    </Modal>
  )
}
