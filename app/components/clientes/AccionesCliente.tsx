'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { desactivarCliente, reactivarCliente } from '@/app/actions/clientes'
import { Modal } from '@/components/ui/Modal'

interface AccionesClienteProps {
  id: string
  activo: boolean
}

export function AccionesCliente({ id, activo }: AccionesClienteProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function confirmar() {
    setError(null)
    startTransition(async () => {
      const res = activo ? await desactivarCliente(id) : await reactivarCliente(id)
      if (!res.ok) {
        setError(res.error ?? 'Error desconocido')
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={isPending}
        className={
          activo
            ? 'h-10 px-4 text-sm font-medium border border-danger-border text-danger-soft-fg rounded-[var(--radius-full)] hover:bg-danger-soft disabled:opacity-60'
            : 'h-10 px-4 text-sm font-medium border border-border-default text-fg rounded-[var(--radius-full)] hover:bg-surface-hover disabled:opacity-60'
        }
      >
        {activo ? 'Desactivar' : 'Reactivar'}
      </button>

      <Modal
        open={open}
        onClose={() => { if (!isPending) { setOpen(false); setError(null) } }}
        title={activo ? 'Desactivar cliente' : 'Reactivar cliente'}
        description={
          activo
            ? 'Se conserva el historial pero no aparecerá en búsquedas.'
            : 'El cliente volverá a aparecer en búsquedas y el POS.'
        }
        size="sm"
        mobileFullscreen={false}
        footer={
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setOpen(false); setError(null) }}
              disabled={isPending}
              className="h-10 px-4 rounded-[var(--radius-full)] border border-border-default text-sm text-fg hover:bg-surface-hover disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmar}
              disabled={isPending}
              className={
                activo
                  ? 'h-10 px-4 rounded-[var(--radius-full)] bg-danger-soft text-danger-soft-fg border border-danger-border text-sm font-semibold disabled:opacity-50'
                  : 'h-10 px-4 rounded-[var(--radius-full)] bg-fg hover:bg-fg-muted text-white text-sm font-semibold disabled:opacity-50'
              }
            >
              {isPending ? 'Procesando…' : activo ? 'Desactivar' : 'Reactivar'}
            </button>
          </div>
        }
      >
        {error && (
          <div className="bg-danger-soft border border-danger-border rounded-[var(--radius-md)] px-3 py-2 text-sm text-danger-soft-fg">
            {error}
          </div>
        )}
      </Modal>
    </>
  )
}
