'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { registrarCobroRemito } from '@/app/actions/remitos'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface Props {
  remitoId: string
  montoTotal: number
  montoCobrado: number
  onClose: () => void
  onSuccess: () => void
}

function formatMoney(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2 })
}

export function RegistrarCobroModal({
  remitoId,
  montoTotal,
  montoCobrado,
  onClose,
  onSuccess,
}: Props) {
  const saldo = montoTotal - montoCobrado
  const today = new Date().toISOString().split('T')[0]

  const [monto, setMonto] = useState(saldo > 0 ? saldo : montoTotal)
  const [fecha, setFecha] = useState(today)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (monto <= 0) {
      toast.error('El monto debe ser mayor a cero.')
      return
    }
    startTransition(async () => {
      const res = await registrarCobroRemito(remitoId, monto, fecha)
      if ('error' in res) {
        toast.error(res.error ?? 'Error al registrar el cobro.')
      } else {
        toast.success('Cobro registrado correctamente.')
        onSuccess()
        onClose()
      }
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Registrar cobro"
      description="Remito a cobrar"
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => handleSubmit()} disabled={isPending}>
            {isPending ? 'Guardando…' : 'Registrar cobro'}
          </Button>
        </>
      }
    >
      <div className="bg-surface-sunken rounded-[var(--radius-lg)] px-4 py-3 space-y-1 text-sm mb-4">
        <div className="flex justify-between text-fg-muted">
          <span>Total</span>
          <span className="font-mono tabular-nums">${formatMoney(montoTotal)}</span>
        </div>
        {montoCobrado > 0 && (
          <div className="flex justify-between text-fg-muted">
            <span>Ya cobrado</span>
            <span className="font-mono tabular-nums">${formatMoney(montoCobrado)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-fg pt-1 border-t border-border-default">
          <span>Saldo pendiente</span>
          <span className="font-mono tabular-nums">
            ${formatMoney(saldo > 0 ? saldo : montoTotal)}
          </span>
        </div>
      </div>

      <p className="text-xs text-info-soft-fg mb-4">
        No requiere caja abierta — el cobro de remito es solo un registro contable, no mueve fondos
        automáticamente.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Monto a cobrar"
          type="number"
          min="0.01"
          step="0.01"
          value={monto}
          onChange={(e) => setMonto(Number(e.target.value))}
          required
        />
        <Input
          label="Fecha de cobro"
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          required
        />
      </form>
    </Modal>
  )
}
