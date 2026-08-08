'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { actualizarPosModoCobro, type PosModoCobro } from '@/app/actions/configuracion'
import { normalizarModoCobro } from '@/lib/pos/cobro-modo'

interface PosModoCobroFormProps {
  initial: PosModoCobro | null | undefined
}

const OPCIONES: {
  value: PosModoCobro
  titulo: string
  descripcion: string
}[] = [
  {
    value: 'clasico',
    titulo: 'Panel lateral (actual)',
    descripcion:
      'Cliente, descuento y pagos en el panel derecho. F2 cobra directo.',
  },
  {
    value: 'guiado',
    titulo: 'Paso a paso (pantallas grandes)',
    descripcion:
      'F2 abre un asistente: pago → cliente → descuento → confirmar. Ideal para cajeros nuevos.',
  },
]

export function PosModoCobroForm({ initial }: PosModoCobroFormProps) {
  const router = useRouter()
  const [modo, setModo] = useState<PosModoCobro>(normalizarModoCobro(initial))
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function guardar(nuevo: PosModoCobro) {
    setModo(nuevo)
    setMensaje(null)
    startTransition(async () => {
      const res = await actualizarPosModoCobro(nuevo)
      if (res.ok) {
        setMensaje({ tipo: 'ok', texto: 'Modo de cobro actualizado' })
        router.refresh()
      } else {
        setMensaje({ tipo: 'error', texto: res.error ?? 'Error al guardar' })
        setModo(normalizarModoCobro(initial))
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {OPCIONES.map((op) => {
          const activo = modo === op.value
          return (
            <button
              key={op.value}
              type="button"
              disabled={isPending}
              onClick={() => guardar(op.value)}
              className={[
                'text-left rounded-[var(--radius-lg)] border-2 p-5 transition-colors min-h-[120px]',
                activo
                  ? 'border-primary bg-primary-soft ring-2 ring-primary/30'
                  : 'border-border-default bg-surface hover:border-border-default hover:bg-surface-sunken',
                isPending ? 'opacity-60 cursor-wait' : '',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                <span
                  className={[
                    'mt-0.5 h-5 w-5 rounded-[var(--radius-full)] border-2 shrink-0 flex items-center justify-center',
                    activo ? 'border-primary' : 'border-border-default',
                  ].join(' ')}
                >
                  {activo && <span className="h-2.5 w-2.5 rounded-[var(--radius-full)] bg-primary" />}
                </span>
                <div>
                  <p className="text-[15px] font-bold text-fg">{op.titulo}</p>
                  <p className="text-[13px] text-fg-muted mt-1 leading-snug">{op.descripcion}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>
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
