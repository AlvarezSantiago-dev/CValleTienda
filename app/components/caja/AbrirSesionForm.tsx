'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { abrirSesion } from '@/app/actions/caja'

export function AbrirSesionForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [monto, setMonto] = useState('0')
  const [obs, setObs] = useState('')
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const n = Number(monto)
    if (!Number.isFinite(n) || n < 0) {
      setError('Ingresá un monto válido')
      return
    }
    startTransition(async () => {
      const res = await abrirSesion({
        monto_apertura_efectivo: n,
        observaciones: obs || null,
      })
      if (res.ok) {
        router.refresh()
      } else {
        setError(res.error ?? 'Error al abrir caja')
      }
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)] max-w-md"
    >
      <div className="px-6 py-5 border-b border-gray-50">
        <h2 className="text-[15px] font-semibold text-gray-900">Abrir caja</h2>
        <p className="text-[13px] text-gray-400 mt-1">
          Indicá cuánto efectivo tenés en el cajón al iniciar el turno (fondo de cambio).
        </p>
      </div>

      <div className="px-6 py-5 space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <Input
          label="Monto de apertura (efectivo)"
          type="number"
          step="0.01"
          min="0"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          hint="Lo que hay físicamente en la caja al empezar."
          required
        />

        <Textarea
          label="Observaciones (opcional)"
          rows={2}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Notas del turno, novedades, etc."
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? 'Abriendo…' : 'Abrir caja'}
        </Button>
      </div>
    </form>
  )
}
