'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { anularVenta } from '@/app/actions/ventas'

interface Props {
  ventaId: string
  numeroTicket: number
  ticketLabel?: string
}

export function AnularVentaButton({ ventaId, numeroTicket, ticketLabel }: Props) {
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleClick() {
    setConfirmando(true)
    setError(null)
  }

  function handleCancelar() {
    setConfirmando(false)
    setError(null)
  }

  function handleConfirmar() {
    startTransition(async () => {
      const res = await anularVenta(ventaId)
      if (res.ok) {
        router.refresh()
      } else {
        setError(res.error ?? 'Error al anular')
        setConfirmando(false)
      }
    })
  }

  if (confirmando) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[13px] text-gray-600">
          ¿Anular venta {ticketLabel ?? `#${numeroTicket}`}? Esta acción no se puede deshacer.
        </span>
        <button
          type="button"
          onClick={handleCancelar}
          disabled={isPending}
          className="inline-flex items-center justify-center h-10 px-4 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleConfirmar}
          disabled={isPending}
          className="inline-flex items-center justify-center h-10 px-4 rounded-full border border-red-300 bg-red-50 hover:bg-red-100 text-sm font-medium text-red-800 disabled:opacity-50"
        >
          {isPending ? 'Anulando…' : 'Confirmar anulación'}
        </button>
        {error && <span className="text-[13px] text-red-600">{error}</span>}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center justify-center h-10 px-4 rounded-full border border-red-200 bg-white hover:bg-red-50 text-sm font-medium text-red-700"
    >
      Anular
    </button>
  )
}
