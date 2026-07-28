'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarRedondeoEfectivo } from '@/app/actions/configuracion'

interface RedondeoEfectivoFormProps {
  initial: boolean | null | undefined
}

export function RedondeoEfectivoForm({ initial }: RedondeoEfectivoFormProps) {
  const router = useRouter()
  const [activo, setActivo] = useState(initial !== false)
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function guardar(nuevo: boolean) {
    setActivo(nuevo)
    setMensaje(null)
    startTransition(async () => {
      const res = await actualizarRedondeoEfectivo(nuevo)
      if (res.ok) {
        setMensaje({
          tipo: 'ok',
          texto: nuevo ? 'Redondeo de efectivo activado' : 'Redondeo de efectivo desactivado',
        })
        router.refresh()
      } else {
        setMensaje({ tipo: 'error', texto: res.error ?? 'Error al guardar' })
        setActivo(initial !== false)
      }
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[15px] font-bold text-gray-900">Redondear vuelto en efectivo ($100)</p>
          <p className="text-[13px] text-gray-500 mt-1 leading-snug max-w-xl">
            El vuelto se entrega solo en billetes de $100. El resto queda en caja (sin monedas). No
            modifica el total de la venta ni la ganancia por producto. No se imprime en el ticket del
            cliente; sí queda registrado para el dueño en caja.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={activo}
          disabled={isPending}
          onClick={() => guardar(!activo)}
          className={[
            'relative h-8 w-14 shrink-0 rounded-full transition-colors',
            activo ? 'bg-lime-500' : 'bg-gray-300',
            isPending ? 'opacity-60 cursor-wait' : '',
          ].join(' ')}
        >
          <span
            className={[
              'absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform',
              activo ? 'left-7' : 'left-1',
            ].join(' ')}
          />
        </button>
      </div>
      {mensaje && (
        <p
          className={`text-[13px] font-medium ${
            mensaje.tipo === 'ok' ? 'text-lime-700' : 'text-red-600'
          }`}
        >
          {mensaje.texto}
        </p>
      )}
    </div>
  )
}
