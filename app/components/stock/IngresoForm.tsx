'use client'

import { useRef, useState, useTransition } from 'react'
import { ingresarStock } from '@/app/actions/stock'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { useAutoFocus } from '@/lib/hooks/useAutoFocus'

interface IngresoFormProps {
  varianteId: string
  unidadDeMedida?: string
}

const UNIDADES_ENTERAS = new Set(['unidad', 'pack', 'caja', 'bolsa'])

export function IngresoForm({ varianteId, unidadDeMedida = 'unidad' }: IngresoFormProps) {
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const cantidadRef = useRef<HTMLInputElement>(null)
  useAutoFocus(cantidadRef)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)
    startTransition(async () => {
      const res = await ingresarStock({
        variante_id: varianteId,
        cantidad: Number(cantidad),
        motivo,
      })
      if (res.ok) {
        setFeedback({ ok: true, msg: `Ingresadas ${cantidad} ${unidadDeMedida}` })
        setCantidad('')
        setMotivo('')
      } else {
        setFeedback({ ok: false, msg: res.error ?? 'Error desconocido' })
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-100 p-5 space-y-4"
    >
      <div>
        <h3 className="text-sm font-semibold text-[#0A0A0A]">Ingresar mercadería</h3>
        <p className="text-[13px] text-gray-400 mt-0.5">
          Suma cantidad al stock actual. Útil para reposición de proveedor.
        </p>
      </div>

      <Input
        ref={cantidadRef}
        label={`Cantidad${unidadDeMedida !== 'unidad' ? ' (' + unidadDeMedida + ')' : ''}`}
        type="number"
        min={UNIDADES_ENTERAS.has(unidadDeMedida) ? 1 : 0.001}
        step={UNIDADES_ENTERAS.has(unidadDeMedida) ? 1 : 0.001}
        required
        value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
        placeholder={UNIDADES_ENTERAS.has(unidadDeMedida) ? 'Ej. 12' : 'Ej. 25.500'}
      />

      <Textarea
        label="Motivo"
        required
        rows={2}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Ej. Compra a Proveedor X, factura 1234"
      />

      {feedback && (
        <div
          className={`text-sm rounded-lg px-3 py-2 ${
            feedback.ok
              ? 'bg-lime-50 text-lime-800 border border-lime-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? 'Procesando…' : 'Registrar ingreso'}
      </Button>
    </form>
  )
}
