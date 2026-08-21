'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { CobroPagoModal } from '@/components/pos/CobroPagoModal'
import { CondicionPagoToggle } from '@/components/pos/CondicionPagoToggle'
import type { MetodoPago } from '@/lib/configuracion/queries'
import type { PagoLinea } from '@/components/pos/PagoMultiMetodo'
import { convertirPedidoAVenta } from '@/app/actions/catalogo'
import { formatARS } from '@/lib/format'
import { puedeCobrarVenta } from '@/lib/pos/puede-cobrar'
import { precioConRecargoCc } from '@/lib/pos/precio-cc'
import { useRubro } from '@/components/layout/RubroProvider'
import type { CondicionPago, PedidoCatalogo } from '@/types/database'

export function ConvertirPedidoModal({
  pedido,
  metodos,
  cajaAbierta,
  redondeoEfectivoActivo,
  recargoCcDefault = 0,
}: {
  pedido: PedidoCatalogo
  metodos: MetodoPago[]
  cajaAbierta: boolean
  redondeoEfectivoActivo: boolean
  recargoCcDefault?: number
}) {
  const router = useRouter()
  const { usarPedidoCc } = useRubro()
  const [open, setOpen] = useState(false)
  const [pagos, setPagos] = useState<PagoLinea[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [condicion, setCondicion] = useState<CondicionPago>('contado')

  useEffect(() => {
    if (!open) {
      setPagos([])
      setError(null)
    }
  }, [open])

  const esCuentaCorriente = usarPedidoCc && condicion === 'cuenta_corriente'
  const totalEstimado = useMemo(() => {
    if (!esCuentaCorriente) return pedido.total
    return precioConRecargoCc(pedido.total, recargoCcDefault)
  }, [esCuentaCorriente, pedido.total, recargoCcDefault])

  const label = pedido.tipo_entrega === 'envio' ? 'Confirmar envío' : 'Confirmar retiro'
  const puedeCobrar = puedeCobrarVenta({
    hayItems: true,
    stockOk: true,
    totalBruto: totalEstimado,
    saldoFavorAplicado: 0,
    pagos,
    esCuentaCorriente,
  }) && (esCuentaCorriente || metodos.length > 0)

  function confirmar(pagosOverride?: PagoLinea[]) {
    const usados = pagosOverride ?? pagos
    setError(null)
    start(async () => {
      const res = await convertirPedidoAVenta({
        pedidoId: pedido.id,
        condicion_pago: condicion,
        pagos: usados.map((p) => ({
          metodo_pago_id: p.metodo_pago_id,
          monto: p.monto,
          referencia: p.referencia || null,
        })),
      })
      if (!res.ok) {
        setError(res.error ?? 'No se pudo registrar')
        return
      }
      setOpen(false)
      router.refresh()
      if (res.data?.ventaId) router.push(`/ventas/${res.data.ventaId}`)
    })
  }

  if (!cajaAbierta) {
    return (
      <p className="text-sm text-warning-soft-fg bg-warning-soft border border-warning-border rounded-[var(--radius-md)] px-3 py-2">
        Abrí la caja para {label.toLowerCase()} y descontar stock.{' '}
        <a href="/caja" className="underline">
          Ir a caja
        </a>
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {usarPedidoCc && (
        <div className="space-y-2 max-w-sm">
          <CondicionPagoToggle value={condicion} onChange={setCondicion} />
          {esCuentaCorriente && (
            <p className="text-xs text-fg-muted">
              A cuenta: seña opcional. Recargo estimado {formatARS(totalEstimado)} (el exacto al
              confirmar).
            </p>
          )}
        </div>
      )}
      <Button type="button" onClick={() => setOpen(true)}>
        {label} y registrar venta
      </Button>
      <CobroPagoModal
        open={open}
        onClose={() => setOpen(false)}
        metodos={metodos}
        totalAPagar={totalEstimado}
        pagos={pagos}
        onPagosChange={setPagos}
        cliente={{
          id: pedido.cliente_id ?? 'tmp',
          nombre: pedido.cliente_nombre,
          apellido: null,
          dni: null,
          telefono: pedido.cliente_telefono,
          saldo_favor: 0,
          saldo_cc: 0,
          limite_cc: null,
        }}
        onConfirmar={confirmar}
        isCobrando={pending}
        puedeCobrar={puedeCobrar}
        error={error}
        redondeoEfectivoActivo={redondeoEfectivoActivo}
        esCuentaCorriente={esCuentaCorriente}
      />
      <p className="text-xs text-fg-subtle">
        Se descuenta el stock y se emite un solo remito. El cobro es en el local (sin pago online).
      </p>
    </div>
  )
}
