'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
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
  const [cuentaId, setCuentaId] = useState(
    movimiento.cuenta_fondo_id || cuentas[0]?.id || ''
  )
  const [concepto, setConcepto] = useState(movimiento.concepto)
  const [monto, setMonto] = useState(String(movimiento.monto))
  const [error, setError] = useState<string | null>(null)

  const cuentaSeleccionada = cuentas.find((c) => c.id === cuentaId)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const montoNum = Number(monto)
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setError('Ingresá un monto válido mayor a 0')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-[#0A0A0A]">Editar movimiento</h2>
          <p className="text-[13px] text-gray-400 mt-0.5">
            Corregí tipo, cuenta, concepto o monto. Solo con caja abierta.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-gray-700 mb-1.5">Tipo</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTipo('egreso')}
              className={`rounded-lg border py-2 text-sm font-semibold transition-colors ${
                tipo === 'egreso'
                  ? 'border-red-400 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Egreso
            </button>
            <button
              type="button"
              onClick={() => setTipo('ingreso')}
              className={`rounded-lg border py-2 text-sm font-semibold transition-colors ${
                tipo === 'ingreso'
                  ? 'border-lime-400 bg-lime-50 text-lime-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
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
                  {c.nombre} — {formatARS(c.saldo_actual)}
                </option>
              ))}
            </Select>
            {cuentaSeleccionada && tipo === 'egreso' && (
              <p className="text-xs text-gray-400 mt-1">
                Saldo disponible: {formatARS(cuentaSeleccionada.saldo_actual)}
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
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
          />

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" disabled={isPending || !cuentaId}>
              {isPending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
