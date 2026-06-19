'use client'

import { useState, useTransition } from 'react'
import { obtenerPayloadCierre } from '@/app/actions/impresion'
import { usePrint } from '@/lib/impresion/usePrint'
import { CierreCajaRenderer } from '@/components/impresion/CierreCajaRenderer'

interface Props {
  sesionId: string
  cierreId: string
}

export function ImprimirCierreButton({ sesionId, cierreId }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const { contenido, imprimirConPayload } = usePrint({ tipo: 'ticket' })

  const onClick = () => {
    setError(null)
    startTransition(async () => {
      const r = await obtenerPayloadCierre(sesionId, cierreId)
      if (r.ok && r.data) {
        imprimirConPayload('cierre', r.data, <CierreCajaRenderer payload={r.data} />)
      } else {
        setError(r.error ?? 'No se pudo generar el ticket')
      }
    })
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center justify-center h-10 px-4 rounded-full border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
      >
        {pending ? 'Preparando…' : 'Imprimir cierre'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
      {contenido}
    </div>
  )
}
