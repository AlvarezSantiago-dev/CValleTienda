'use client'

import { useState, useTransition } from 'react'
import { Printer } from 'lucide-react'
import { obtenerPayloadCierre } from '@/app/actions/impresion'
import { usePrint } from '@/lib/impresion/usePrint'
import { CierreCajaRenderer } from '@/components/impresion/CierreCajaRenderer'
import { Button } from '@/components/ui/Button'

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
      <Button type="button" variant="outline" onClick={onClick} disabled={pending} size="sm">
        <Printer size={14} aria-hidden />
        {pending ? 'Preparando…' : 'Imprimir cierre'}
      </Button>
      {error && <span className="text-xs text-danger-soft-fg">{error}</span>}
      {contenido}
    </div>
  )
}
