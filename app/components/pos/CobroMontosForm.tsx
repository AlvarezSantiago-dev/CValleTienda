'use client'

import type { MetodoPago } from '@/lib/configuracion/queries'
import { formatARS } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { PagoRapidoChips } from './PagoRapidoChips'
import { PagoMultiMetodo, type PagoLinea } from './PagoMultiMetodo'

interface CobroMontosFormProps {
  metodos: MetodoPago[]
  totalAPagar: number
  pagos: PagoLinea[]
  onPagosChange: (p: PagoLinea[]) => void
  onConfirmarMonto?: () => void
  redondeoEfectivoActivo?: boolean
  esCuentaCorriente?: boolean
  onSinSena?: () => void
  clienteNombre?: string | null
  sinSenaDisabled?: boolean
}

export function CobroMontosForm({
  metodos,
  totalAPagar,
  pagos,
  onPagosChange,
  onConfirmarMonto,
  redondeoEfectivoActivo = true,
  esCuentaCorriente = false,
  onSinSena,
  clienteNombre,
  sinSenaDisabled = false,
}: CobroMontosFormProps) {
  const cobrado = pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0)
  const deuda = Math.max(0, totalAPagar - cobrado)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Total a pagar</p>
        <p className="text-3xl sm:text-4xl font-bold font-mono tabular-nums text-fg leading-none">
          {formatARS(totalAPagar)}
        </p>
        {clienteNombre ? (
          <p className="text-sm text-fg-muted pt-1">{clienteNombre}</p>
        ) : null}
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-[0.07em] font-semibold text-fg-subtle mb-3">
          {esCuentaCorriente ? 'Seña (opcional)' : 'Forma de pago'}
        </p>
        {esCuentaCorriente && (
          <p className="text-sm text-fg-muted mb-3">
            Si no cargás un pago, el total queda como deuda
            {deuda > 0 ? (
              <>
                {' '}
                (
                <strong className="text-fg tabular-nums">{formatARS(deuda)}</strong>
                ).
              </>
            ) : (
              '.'
            )}
          </p>
        )}
        <PagoRapidoChips
          metodos={metodos}
          total={totalAPagar}
          pagos={pagos}
          onChange={onPagosChange}
          redondeoEfectivoActivo={redondeoEfectivoActivo}
        />
        {esCuentaCorriente && onSinSena && (
          <Button
            type="button"
            variant="secondary"
            onClick={onSinSena}
            disabled={sinSenaDisabled}
            className="w-full min-h-[48px] mt-1"
          >
            Sin seña — todo a cuenta
          </Button>
        )}
      </div>

      <PagoMultiMetodo
        metodos={metodos}
        pagos={pagos}
        total={totalAPagar}
        onChange={onPagosChange}
        onCobrar={onConfirmarMonto}
        size="xl"
        redondeoEfectivoActivo={redondeoEfectivoActivo}
      />
    </div>
  )
}
