'use client'

import type { MetodoPago } from '@/lib/configuracion/queries'
import type { PagoLinea } from '../PagoMultiMetodo'
import { CobroMontosForm } from '../CobroMontosForm'

interface PasoPagoProps {
  metodos: MetodoPago[]
  totalAPagar: number
  pagos: PagoLinea[]
  onPagosChange: (pagos: PagoLinea[]) => void
  onSiguiente: () => void
  redondeoEfectivoActivo?: boolean
  esCuentaCorriente?: boolean
}

export function PasoPago({
  metodos,
  totalAPagar,
  pagos,
  onPagosChange,
  onSiguiente,
  redondeoEfectivoActivo = true,
  esCuentaCorriente = false,
}: PasoPagoProps) {
  return (
    <CobroMontosForm
      metodos={metodos}
      totalAPagar={totalAPagar}
      pagos={pagos}
      onPagosChange={onPagosChange}
      onConfirmarMonto={onSiguiente}
      redondeoEfectivoActivo={redondeoEfectivoActivo}
      esCuentaCorriente={esCuentaCorriente}
      onSinSena={() => {
        onPagosChange([])
        onSiguiente()
      }}
    />
  )
}
