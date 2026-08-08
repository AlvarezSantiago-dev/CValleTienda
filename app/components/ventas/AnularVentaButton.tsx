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

export function AnularVentaButton({ ventaId, numeroTicket, ticketLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleConfirmar() {
    startTransition(async () => {
      const res = await anularVenta(ventaId)
      if (res.ok) {
        setOpen(false)
        router.refresh()
      } else {
        setError(res.error ?? 'Error al anular')
      }
    })
  }

  return (
    <>
      <Button type="button" variant="danger" size="sm" onClick={() => { setOpen(true); setError(null) }}>
        Anular
      </Button>

      <Modal
        open={open}
        onClose={() => { setOpen(false); setError(null) }}
        title="Anular venta"
        description={`¿Anular venta ${ticketLabel ?? `#${numeroTicket}`}? Esta acción no se puede deshacer.`}
        size="sm"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => { setOpen(false); setError(null) }}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={handleConfirmar} disabled={isPending}>
              {isPending ? 'Anulando…' : 'Confirmar anulación'}
            </Button>
          </>
        }
      >
        {error && <p className="text-sm text-danger-soft-fg">{error}</p>}
      </Modal>
    </>
  )
}
