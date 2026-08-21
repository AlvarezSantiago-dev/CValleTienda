'use client'

import { useEffect, useRef, useTransition } from 'react'
import { obtenerPayloadReciboCc } from '@/app/actions/recibo-cc'
import { usePrint } from '@/lib/impresion/usePrint'
import { ReciboCcRenderer } from '@/components/impresion/ReciboCcRenderer'
import { Button } from '@/components/ui/Button'

export function BotonImprimirReciboCc({
  movimientoId,
  auto = false,
  label = 'Imprimir recibo',
}: {
  movimientoId: string
  auto?: boolean
  label?: string
}) {
  const [pending, start] = useTransition()
  const { contenido, imprimir } = usePrint({ tipo: 'ticket' })
  const didAuto = useRef(false)

  function run() {
    start(async () => {
      const r = await obtenerPayloadReciboCc(movimientoId)
      if (r.ok && r.data) {
        imprimir(<ReciboCcRenderer payload={r.data} />)
      }
    })
  }

  useEffect(() => {
    if (!auto || didAuto.current) return
    didAuto.current = true
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, movimientoId])

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={run} disabled={pending}>
        {pending ? 'Imprimiendo…' : label}
      </Button>
      {contenido}
    </>
  )
}
