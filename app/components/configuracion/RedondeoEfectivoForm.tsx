'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarRedondeoEfectivo } from '@/app/actions/configuracion'
import { Switch } from '@/components/ui/Switch'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { AVISO_REDONDEO_TICKET_DEFAULT } from '@/lib/pos/redondeo-efectivo'

interface RedondeoEfectivoFormProps {
  initialActivo: boolean | null | undefined
  initialAviso: string | null | undefined
}

export function RedondeoEfectivoForm({ initialActivo, initialAviso }: RedondeoEfectivoFormProps) {
  const router = useRouter()
  const [activo, setActivo] = useState(initialActivo !== false)
  const [aviso, setAviso] = useState(initialAviso ?? '')
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function guardarTodo(opts?: { activo?: boolean }) {
    const nuevoActivo = opts?.activo ?? activo
    setMensaje(null)
    startTransition(async () => {
      const res = await actualizarRedondeoEfectivo({
        activo: nuevoActivo,
        aviso_ticket: aviso,
      })
      if (res.ok) {
        setMensaje({ tipo: 'ok', texto: 'Configuración de redondeo guardada' })
        router.refresh()
      } else {
        setMensaje({ tipo: 'error', texto: res.error ?? 'Error al guardar' })
        if (opts?.activo != null) setActivo(initialActivo !== false)
      }
    })
  }

  function onToggle(nuevo: boolean) {
    setActivo(nuevo)
    guardarTodo({ activo: nuevo })
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-border-default bg-surface p-5 space-y-4">
      <Switch
        checked={activo}
        onChange={onToggle}
        disabled={isPending}
        label="Redondear vuelto en efectivo ($100)"
        description="El vuelto se entrega solo en billetes de $100. El resto queda en caja. No modifica el total de la venta ni la ganancia por producto."
      />

      {activo && (
        <div className="space-y-2 pt-1 border-t border-border-default">
          <Textarea
            label="Texto del aviso en el ticket"
            hint="Usá {monto} (vuelto no entregado) y {total} (compra). Si lo dejás vacío, se usa el texto por defecto."
            rows={5}
            value={aviso}
            onChange={(e) => setAviso(e.target.value)}
            placeholder={AVISO_REDONDEO_TICKET_DEFAULT}
            disabled={isPending}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => guardarTodo()}
            >
              {isPending ? 'Guardando…' : 'Guardar texto del aviso'}
            </Button>
            <button
              type="button"
              className="text-[12px] text-fg-muted underline hover:text-fg"
              disabled={isPending}
              onClick={() => setAviso(AVISO_REDONDEO_TICKET_DEFAULT)}
            >
              Restaurar texto por defecto
            </button>
          </div>
        </div>
      )}

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
