'use client'

import { useRef, useState, useTransition } from 'react'
import { ajustarStock } from '@/app/actions/stock'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { formatSignedDelta } from '@/lib/format'
import { useAutoFocus } from '@/lib/hooks/useAutoFocus'

interface AjusteFormProps {
  varianteId: string
  stockActual: number
  unidadDeMedida?: string
}

const UNIDADES_ENTERAS = new Set(['unidad', 'pack', 'caja', 'bolsa'])

export function AjusteForm({ varianteId, stockActual, unidadDeMedida = 'unidad' }: AjusteFormProps) {
  const [nuevoStock, setNuevoStock] = useState(String(stockActual))
  const [motivo, setMotivo] = useState('')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const stockRef = useRef<HTMLInputElement>(null)
  useAutoFocus(stockRef, [], true)

  const nuevoNum = Number(nuevoStock)
  const delta = Number.isFinite(nuevoNum) ? nuevoNum - stockActual : 0
  const deltaSignificativo = Math.abs(delta) > Math.max(stockActual, 5)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)

    if (deltaSignificativo) {
      const ok = window.confirm(
        `El ajuste cambia el stock en ${formatSignedDelta(delta)} unidades. ¿Estás seguro?`
      )
      if (!ok) return
    }

    startTransition(async () => {
      const res = await ajustarStock({
        variante_id: varianteId,
        nuevo_stock: nuevoNum,
        motivo,
      })
      if (res.ok) {
        if (res.data?.delta === 0) {
          setFeedback({ ok: true, msg: 'Sin cambios — el stock ya era el indicado' })
        } else {
          setFeedback({
            ok: true,
            msg: `Stock ajustado (${formatSignedDelta(res.data?.delta ?? 0)})`,
          })
          setMotivo('')
        }
      } else {
        setFeedback({ ok: false, msg: res.error ?? 'Error desconocido' })
      }
    })
  }

  const deltaCls =
    delta > 0
      ? 'text-green-700 bg-green-50 border-green-200'
      : delta < 0
      ? 'text-red-700 bg-red-50 border-red-200'
      : 'text-gray-700 bg-gray-50 border-gray-200'

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-gray-100 p-5 space-y-4"
    >
      <div>
        <h3 className="text-sm font-semibold text-[#0A0A0A]">Ajuste por inventario</h3>
        <p className="text-[13px] text-gray-400 mt-0.5">
          Indicá el stock final esperado tras un conteo físico. El sistema calcula la
          diferencia.
        </p>
      </div>

      <Input
        ref={stockRef}
        label={`Nuevo stock (actual: ${stockActual}${unidadDeMedida !== 'unidad' ? ' ' + unidadDeMedida : ''})`}
        type="number"
        min={0}
        step={UNIDADES_ENTERAS.has(unidadDeMedida) ? 1 : 0.001}
        required
        value={nuevoStock}
        onChange={(e) => setNuevoStock(e.target.value)}
      />

      <div
        className={`text-sm rounded-lg px-3 py-2 border ${deltaCls}`}
        aria-live="polite"
      >
        Diferencia:{' '}
        <span className="font-semibold">
          {Number.isFinite(nuevoNum) ? formatSignedDelta(delta) : '—'}
        </span>
      </div>

      <Textarea
        label="Motivo"
        required
        rows={2}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Ej. Inventario físico — faltaban 3 prendas"
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

      <Button
        type="submit"
        variant="secondary"
        disabled={isPending || delta === 0}
        className="w-full"
      >
        {isPending ? 'Procesando…' : 'Aplicar ajuste'}
      </Button>
    </form>
  )
}
