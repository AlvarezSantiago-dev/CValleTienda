'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { anularVenta } from '@/app/actions/ventas'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface Props {
  ventaId: string
  numeroTicket: number
  ticketLabel?: string
}

export function AnularVentaInlineButton({ ventaId, numeroTicket, ticketLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setError(null) }}
        className="text-danger-soft-fg hover:underline text-xs font-medium cursor-pointer"
      >
        Anular
      </button>

      <Modal
        open={open}
        onClose={() => { setOpen(false); setError(null) }}
        title="Anular venta"
        description={`¿Anular ${ticketLabel ?? `#${numeroTicket}`}? No se puede deshacer.`}
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={pending}
              onClick={() => { setOpen(false); setError(null) }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={pending}
              onClick={() => {
                setError(null)
                startTransition(async () => {
                  const res = await anularVenta(ventaId)
                  if (res.ok) {
                    setOpen(false)
                    router.refresh()
                  } else {
                    setError(res.error ?? 'Error al anular')
                  }
                })
              }}
            >
              {pending ? '…' : 'Confirmar'}
            </Button>
          </>
        }
      >
        {error && <p className="text-sm text-danger-soft-fg">{error}</p>}
      </Modal>
    </>
  )
}
