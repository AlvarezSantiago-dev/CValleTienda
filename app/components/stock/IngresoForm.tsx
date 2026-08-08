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
  const [precioCompra, setPrecioCompra] = useState('')
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
        precio_compra: precioCompra ? Number(precioCompra) : undefined,
      })
      if (res.ok) {
        setFeedback({ ok: true, msg: `Ingresadas ${cantidad} ${unidadDeMedida}` })
        setCantidad('')
        setMotivo('')
        setPrecioCompra('')
      } else {
        setFeedback({ ok: false, msg: res.error ?? 'Error desconocido' })
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface rounded-[var(--radius-lg)] border border-border-subtle p-5 space-y-4"
    >
      <div>
        <h3 className="text-sm font-semibold text-fg">Ingresar mercadería</h3>
        <p className="text-[13px] text-fg-subtle mt-0.5">
          Suma cantidad al stock actual. Útil para reposición de proveedor.
        </p>
        <p className="text-[12px] text-blue-600 mt-1">
          No requiere caja abierta — el ingreso de stock es gestión de inventario, no una venta.
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

      <Input
        label="Precio de compra — nuevo lote (opcional)"
        type="number"
        min={0}
        step={0.01}
        value={precioCompra}
        onChange={(e) => setPrecioCompra(e.target.value)}
        placeholder="Ej. 850.50"
      />

      {feedback && (
        <div
          className={`text-sm rounded-[var(--radius-md)] px-3 py-2 ${
            feedback.ok
              ? 'bg-primary-soft text-primary-soft-fg border border-primary-border'
              : 'bg-danger-soft text-danger-soft-fg border border-danger-border'
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
