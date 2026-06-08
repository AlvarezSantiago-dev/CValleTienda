'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { anularVenta } from '@/app/actions/ventas'

interface Props {
  ventaId: string
  numeroTicket: number
  ticketLabel?: string
}

export function AnularVentaInlineButton({ ventaId, numeroTicket, ticketLabel }: Props) {
  const [confirmando, setConfirmando] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="text-red-600 hover:text-red-700 text-xs font-medium"
      >
        Anular
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1 flex-nowrap">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null)
          startTransition(async () => {
            const res = await anularVenta(ventaId)
            if (res.ok) {
              router.refresh()
            } else {
              setError(res.error ?? 'Error al anular')
              setConfirmando(false)
            }
          })
        }}
        className="text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 px-2 py-0.5 rounded-full"
      >
        {pending ? '...' : `Confirmar ${ticketLabel ?? `#${numeroTicket}`}`}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirmando(false)}
        className="text-xs font-medium text-gray-500 hover:text-gray-700"
      >
        Cancelar
      </button>
    </div>
  )
}
