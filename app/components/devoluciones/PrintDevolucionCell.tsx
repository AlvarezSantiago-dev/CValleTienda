'use client'

import { PrintButtonClient } from '@/components/ventas/PrintButtonClient'

interface PrintDevolucionCellProps {
  id: string
}

/**
 * Wrapper Client Component para PrintButtonClient.
 * Necesario para usar dentro de TablaDevoluciones (Server Component)
 * sin pasar event handlers directamente a elementos DOM.
 */
export function PrintDevolucionCell({ id }: PrintDevolucionCellProps) {
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <PrintButtonClient tipo="devolucion" id={id} />
    </div>
  )
}
