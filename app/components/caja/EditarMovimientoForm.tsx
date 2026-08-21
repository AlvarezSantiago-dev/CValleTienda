'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/components/ui/cn'
import { editarMovimientoCaja } from '@/app/actions/caja'
import type { CuentaOpcion } from '@/components/caja/RegistrarMovimientoForm'
import type { MovimientoTurno } from '@/lib/caja/types'
import { formatARS } from '@/lib/format-moneda'

interface Props {
  movimiento: MovimientoTurno
  cuentas: CuentaOpcion[]
  onSuccess: () => void
  onCancel: () => void
}

export function EditarMovimientoForm({ movimiento, cuentas, onSuccess, onCancel }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [tipo, setTipo] = useState<'egreso' | 'ingreso'>(
    movimiento.tipo === 'ingreso' ? 'ingreso' : 'egreso'
  )
  const [cuentaId, setCuentaId] = useState(movimiento.cuenta_fondo_id || cuentas[0]?.id || '')
  const [concepto, setConcepto] = useState(movimiento.concepto)
  const [monto, setMonto] = useState(String(movimiento.monto))
  const [error, setError] = useState<string | null>(null)

  const cuentaSeleccionada = cuentas.find((c) => c.id === cuentaId)

  function onSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    setError(null)
    const montoNum = Number(monto)
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setError('Ingresá un monto válido mayor a 0')
      return
    }
    const techoAlMomento =
      (cuentaSeleccionada?.saldo_al_momento ?? 0) +
      (tipo === 'egreso' &&
      movimiento.tipo === 'egreso' &&
      cuentaId === movimiento.cuenta_fondo_id
        ? movimiento.monto
        : 0)
    if (tipo === 'egreso' && cuentaSeleccionada && montoNum > techoAlMomento) {
      setError(`El monto supera el saldo al momento (${formatARS(techoAlMomento)})`)
      return
    }
    startTransition(async () => {
      const res = await editarMovimientoCaja({
        id: movimiento.id,
        cuenta_fondo_id: cuentaId,
        tipo,
        concepto: concepto.trim(),
        monto: montoNum,
      })
      if (res.ok) {
        router.refresh()
        onSuccess()
      } else {
        setError(res.error ?? 'Error al editar el movimiento')
      }
    })
  }

  return (
    <Modal
      open
      onClose={onCancel}
      title="Editar movimiento"
      description="Corregí tipo, cuenta, concepto o monto. Solo con caja abierta."
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => onSubmit()} disabled={isPending || !cuentaId}>
            {isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-danger-border bg-danger-soft p-3 text-sm text-danger-soft-fg">
          {error}
        </div>
      )}

      <div className="mb-4">
        <p className="text-sm font-medium text-fg mb-1.5">Tipo</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTipo('egreso')}
            className={cn(
              'rounded-[var(--radius-md)] border py-2 text-sm font-semibold transition-colors cursor-pointer focus-ring',
              tipo === 'egreso'
                ? 'border-danger-border bg-danger-soft text-danger-soft-fg'
                : 'border-border-default bg-surface text-fg-muted hover:bg-surface-hover'
            )}
          >
            Egreso
          </button>
          <button
            type="button"
            onClick={() => setTipo('ingreso')}
            className={cn(
              'rounded-[var(--radius-md)] border py-2 text-sm font-semibold transition-colors cursor-pointer focus-ring',
              tipo === 'ingreso'
                ? 'border-primary-border bg-primary-soft text-primary-soft-fg'
                : 'border-border-default bg-surface text-fg-muted hover:bg-surface-hover'
            )}
          >
            Ingreso
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Select
            label="Cuenta"
            value={cuentaId}
            onChange={(e) => setCuentaId(e.target.value)}
            required
          >
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} — {formatARS(c.saldo_al_momento)} al momento
              </option>
            ))}
          </Select>
          {cuentaSeleccionada && tipo === 'egreso' && (
            <p className="text-xs text-fg-subtle mt-1">
              Saldo al momento: {formatARS(cuentaSeleccionada.saldo_al_momento)}
              {cuentaSeleccionada.por_acreditar > 0
                ? `. Hay ${formatARS(cuentaSeleccionada.por_acreditar)} por acreditar (no se puede egresar todavía).`
                : ''}
            </p>
          )}
        </div>

        <Input
          label="Concepto"
          type="text"
          value={concepto}
          onChange={(e) => setConcepto(e.target.value)}
          placeholder="Ej: Retiro para depósito, Pago proveedor…"
          required
        />

        <Input
          label="Monto"
          type="number"
          step="0.01"
          min="0.01"
          max={tipo === 'egreso' && cuentaSeleccionada ? String(cuentaSeleccionada.saldo_al_momento) : undefined}
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          required
        />
      </form>
    </Modal>
  )
}
