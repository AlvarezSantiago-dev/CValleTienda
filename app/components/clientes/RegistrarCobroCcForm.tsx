'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { registrarCobroCliente } from '@/app/actions/cuenta-corriente'
import type { RemitoPendienteCc } from '@/lib/cc/queries'
import type { CuentaFondo } from '@/lib/configuracion/queries'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { formatARS } from '@/lib/format'
import { BotonImprimirReciboCc } from './BotonImprimirReciboCc'

interface RegistrarCobroCcFormProps {
  clienteId: string
  saldoCc: number
  remitos: RemitoPendienteCc[]
  cuentas: CuentaFondo[]
}

export function RegistrarCobroCcForm({
  clienteId,
  saldoCc,
  remitos,
  cuentas,
}: RegistrarCobroCcFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [monto, setMonto] = useState('')
  const [cuentaId, setCuentaId] = useState(cuentas[0]?.id ?? '')
  const [remitoIds, setRemitoIds] = useState<string[]>(remitos.map((r) => r.id))
  const [error, setError] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)
  const [reciboId, setReciboId] = useState<string | null>(null)

  function toggleRemito(id: string) {
    setRemitoIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOkMsg(null)
    const valor = Math.round(Number(monto) * 100) / 100
    if (!Number.isFinite(valor) || valor <= 0) {
      setError('Ingresá un monto mayor a cero')
      return
    }
    startTransition(async () => {
      const cuenta = cuentas.find((c) => c.id === cuentaId)
      const res = await registrarCobroCliente({
        clienteId,
        monto: valor,
        cuentaFondoId: cuentaId || null,
        remitoIds: remitoIds.length > 0 ? remitoIds : undefined,
        medioPago: cuenta?.nombre ?? null,
      })
      if (!res.ok) {
        setError(res.error ?? 'No se pudo registrar el cobro')
        return
      }
      setMonto('')
      setOkMsg('Cobro registrado')
      if (res.data?.movimientoId) setReciboId(res.data.movimientoId)
      router.refresh()
    })
  }

  if (saldoCc <= 0.01) return null

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-5 space-y-4"
    >
      <h3 className="text-[15px] font-semibold text-fg">Registrar cobro</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Monto"
          type="number"
          min={0}
          step="0.01"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          hint={`Deuda ${formatARS(saldoCc)}`}
          required
        />
        <Select
          label="Cuenta de fondos"
          value={cuentaId}
          onChange={(e) => setCuentaId(e.target.value)}
          hint="Opcional — registra ingreso si hay caja abierta"
        >
          <option value="">Sin movimiento de caja</option>
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </Select>
      </div>

      {remitos.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
            Imputar a remitos
          </legend>
          {remitos.map((r) => (
            <label key={r.id} className="flex items-center gap-2 text-sm text-fg cursor-pointer">
              <input
                type="checkbox"
                checked={remitoIds.includes(r.id)}
                onChange={() => toggleRemito(r.id)}
                className="h-4 w-4 rounded border-border-default text-primary focus:ring-primary/40"
              />
              Remito #{r.numero_remito} · pendiente {formatARS(r.pendiente)}
            </label>
          ))}
        </fieldset>
      )}

      {error && (
        <p className="text-sm text-danger-soft-fg bg-danger-soft border border-danger-border rounded-[var(--radius-md)] px-3 py-2">
          {error}
        </p>
      )}
      {okMsg && <p className="text-sm text-success-soft-fg">{okMsg}</p>}
      {reciboId && <BotonImprimirReciboCc movimientoId={reciboId} auto />}

      <Button type="submit" disabled={isPending} size="sm">
        {isPending ? 'Registrando…' : 'Cobrar deuda'}
      </Button>
    </form>
  )
}
