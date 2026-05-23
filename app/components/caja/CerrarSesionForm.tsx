'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { cerrarSesion } from '@/app/actions/caja'
import type { SesionConTotales } from '@/lib/caja/types'

interface CerrarSesionFormProps {
  sesion: SesionConTotales
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

export function CerrarSesionForm({ sesion }: CerrarSesionFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [efectivo, setEfectivo] = useState('')
  const [obs, setObs] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Saldo de efectivo actual estimado (sin restar devoluciones del turno — el RPC lo recalcula igual)
  const saldoEfectivo =
    sesion.saldos_cuentas.find((c) => c.tipo === 'efectivo')?.saldo_actual ?? 0

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!confirm) {
      setConfirm(true)
      return
    }

    startTransition(async () => {
      const declarado = efectivo.trim() === '' ? null : Number(efectivo)
      if (declarado != null && (!Number.isFinite(declarado) || declarado < 0)) {
        setError('El efectivo declarado debe ser un número ≥ 0')
        return
      }
      const res = await cerrarSesion({
        sesion_id: sesion.id,
        efectivo_declarado: declarado,
        observaciones: obs || null,
      })
      if (res.ok) {
        router.refresh()
      } else {
        setError(res.error ?? 'Error al cerrar caja')
        setConfirm(false)
      }
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)] max-w-xl"
    >
      <div className="px-6 py-5 border-b border-gray-50">
        <h2 className="text-[15px] font-semibold text-gray-900">Cerrar caja</h2>
        <p className="text-[13px] text-gray-400 mt-1">
          Contá el efectivo del cajón y declaralo. Los totales y el desglose por cuenta se
          calculan automáticamente.
        </p>
      </div>

      <div className="px-6 py-5 space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
          <p className="font-medium">Saldo actual de efectivo en sistema:</p>
          <p className="text-base font-semibold tabular-nums">{formatARS(saldoEfectivo)}</p>
          <p className="text-xs text-amber-800 mt-1">
            Comparalo con lo que contás físicamente y declaralo abajo.
          </p>
        </div>

        <Input
          label="Efectivo declarado (opcional)"
          type="number"
          step="0.01"
          min="0"
          value={efectivo}
          onChange={(e) => setEfectivo(e.target.value)}
          hint="Si lo dejás en blanco, no se calcula diferencia."
        />

        <Textarea
          label="Observaciones del cierre (opcional)"
          rows={2}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
        />

        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          {confirm ? (
            <>
              <Button type="submit" variant="danger" disabled={isPending}>
                {isPending ? 'Cerrando…' : 'Confirmar cierre'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirm(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <span className="text-xs text-gray-400">
                Al confirmar, no se podrán registrar más ventas en esta sesión.
              </span>
            </>
          ) : (
            <Button type="submit">Cerrar caja</Button>
          )}
        </div>
      </div>
    </form>
  )
}
