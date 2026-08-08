'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarRedondeoEfectivo } from '@/app/actions/configuracion'
import { Switch } from '@/components/ui/Switch'

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
    <div className="rounded-[var(--radius-lg)] border border-border-default bg-surface p-5 space-y-4">
      <Switch
        checked={activo}
        onChange={guardar}
        disabled={isPending}
        label="Redondear vuelto en efectivo ($100)"
        description="El vuelto se entrega solo en billetes de $100. El resto queda en caja (sin monedas). No modifica el total de la venta ni la ganancia por producto. En el ticket aparece un aviso de “vuelto no entregado”."
      />
      {mensaje && (
        <p
          className={`text-[13px] font-medium ${
            mensaje.tipo === 'ok' ? 'text-fg-brand' : 'text-danger-soft-fg'
          }`}
        >
          {mensaje.texto}
        </p>
      )}
    </div>
  )
}
