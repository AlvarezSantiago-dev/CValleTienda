'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { registrarCobroRemito } from '@/app/actions/remitos'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

export interface MetodoPagoCobro {
  id: string
  nombre: string
}

interface Props {
  remitoId: string
  montoTotal: number
  montoCobrado: number
  metodosPago: MetodoPagoCobro[]
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
  metodosPago,
  onClose,
  onSuccess,
}: Props) {
  const router = useRouter()
  const saldo = montoTotal - montoCobrado
  const today = new Date().toISOString().split('T')[0]

  const [monto, setMonto] = useState(saldo > 0 ? saldo : montoTotal)
  const [fecha, setFecha] = useState(today)
  const [metodoPagoId, setMetodoPagoId] = useState(metodosPago[0]?.id ?? '')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    if (monto <= 0) {
      toast.error('El monto debe ser mayor a cero.')
      return
    }
    if (!metodoPagoId) {
      toast.error('Elegí un método de pago.')
      return
    }
    startTransition(async () => {
      const res = await registrarCobroRemito(remitoId, monto, fecha, metodoPagoId)
      if (!res.ok) {
        toast.error(res.error ?? 'Error al registrar el cobro.')
      } else {
        toast.success('Cobro registrado correctamente.')
        onSuccess()
        onClose()
        if (res.movimientoId) router.push(`/recibos-cc/${res.movimientoId}`)
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
          <Button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isPending || metodosPago.length === 0}
          >
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

      {metodosPago.length === 0 ? (
        <p className="text-xs text-warning-soft-fg mb-4">
          No hay métodos de pago activos. Configuralos en Cobros para registrar este cobro.
        </p>
      ) : (
        <p className="text-xs text-fg-muted mb-4">
          Si hay caja abierta, el cobro entra a la cuenta asociada al método.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Método de pago"
          value={metodoPagoId}
          onChange={(e) => setMetodoPagoId(e.target.value)}
          required
          disabled={metodosPago.length === 0}
        >
          {metodosPago.length === 0 ? (
            <option value="">Sin métodos configurados</option>
          ) : (
            metodosPago.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))
          )}
        </Select>
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
