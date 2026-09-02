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
import {
  aplicarPagoRapido,
  esMetodoEfectivo,
  metodoPorDefecto,
} from '@/lib/pos/pago-rapido'
import { precioConRecargoCc, recargoEfectivo } from '@/lib/pos/precio-cc'
import { precioConTramo, qtyParaTramo } from '@/lib/precios/tramos-cantidad'
import { useRubro } from '@/components/layout/RubroProvider'
import type { CondicionPago, PedidoCatalogo, PedidoCatalogoItem } from '@/types/database'

function totalEstimado(
  items: PedidoCatalogoItem[],
  condicion: CondicionPago,
  recargoDefault: number,
  fallback: number
): number {
  if (items.length === 0) return fallback
  const grupos = items.map((it) => ({
    productoId: it.producto_id,
    packId: it.pack_id,
    cantidad: Number(it.cantidad),
    esPack: Boolean(it.pack_id),
  }))
  return items.reduce((acc, it) => {
    const lista = Number(it.precio_lista ?? it.precio_unitario)
    const qty = qtyParaTramo(grupos, {
      productoId: it.producto_id,
      packId: it.pack_id,
      cantidad: Number(it.cantidad),
      esPack: Boolean(it.pack_id),
    })
    const contado = precioConTramo(lista, it.tramos ?? [], qty)
    const recargo = recargoEfectivo(it.recargo_cc_pct, recargoDefault)
    const unit =
      condicion === 'cuenta_corriente' ? precioConRecargoCc(contado, recargo) : contado
    return acc + unit * Number(it.cantidad)
  }, 0)
}

export function ConvertirPedidoModal({
  pedido,
  items = [],
  metodos,
  cajaAbierta,
  redondeoEfectivoActivo,
  recargoCcDefault = 0,
  confirmarRemito = false,
  showButton = true,
  open: openCtrl,
  onOpenChange,
}: {
  pedido: PedidoCatalogo
  items?: PedidoCatalogoItem[]
  metodos: MetodoPago[]
  cajaAbierta: boolean
  redondeoEfectivoActivo: boolean
  recargoCcDefault?: number
  confirmarRemito?: boolean
  showButton?: boolean
  open?: boolean
  onOpenChange?: (v: boolean) => void
}) {
  const router = useRouter()
  const { usarPedidoCc } = useRubro()
  const [openInt, setOpenInt] = useState(false)
  const open = openCtrl ?? openInt
  function setOpen(v: boolean) {
    onOpenChange?.(v)
    if (openCtrl === undefined) setOpenInt(v)
  }
  const [pagos, setPagos] = useState<PagoLinea[]>([])
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [condicion, setCondicion] = useState<CondicionPago>(
    usarPedidoCc && pedido.condicion_pago === 'cuenta_corriente'
      ? 'cuenta_corriente'
      : 'contado'
  )

  const esCuentaCorriente = usarPedidoCc && condicion === 'cuenta_corriente'
  const estimado = useMemo(
    () => totalEstimado(items, condicion, recargoCcDefault, pedido.total),
    [pedido, items, condicion, recargoCcDefault]
  )

  useEffect(() => {
    if (!open) {
      setPagos([])
      setError(null)
      return
    }
    if (esCuentaCorriente) return
    const m = metodoPorDefecto(metodos)
    if (m && esMetodoEfectivo(m)) {
      setPagos(
        aplicarPagoRapido(m.id, estimado, {
          esEfectivo: true,
          redondeoActivo: redondeoEfectivoActivo,
        })
      )
    }
  }, [open, esCuentaCorriente, metodos, estimado, redondeoEfectivoActivo])

  const label = confirmarRemito
    ? 'Confirmar remito y cobrar'
    : pedido.tipo_entrega === 'envio'
      ? 'Confirmar envío y cobrar'
      : 'Confirmar retiro y cobrar'
  const puedeCobrar = puedeCobrarVenta({
    hayItems: true,
    stockOk: true,
    totalBruto: estimado,
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
        Abrí la caja para {confirmarRemito ? 'confirmar el remito' : pedido.tipo_entrega === 'envio' ? 'confirmar el envío' : 'confirmar el retiro'} y descontar stock.{' '}
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
          <p className="text-xs font-medium text-fg-muted">Cobrar como</p>
          <CondicionPagoToggle value={condicion} onChange={setCondicion} />
          {esCuentaCorriente && (
            <p className="text-xs text-fg-muted">
              A cuenta: seña opcional. Total con recargo por línea {formatARS(estimado)}.
            </p>
          )}
        </div>
      )}
      {showButton && (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full sm:w-auto hidden sm:inline-flex"
        >
          {label} · {formatARS(estimado)}
        </Button>
      )}
      <CobroPagoModal
        open={open}
        onClose={() => setOpen(false)}
        metodos={metodos}
        totalAPagar={estimado}
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
        {confirmarRemito
          ? 'El stock se descuenta ahora. El remito ya está emitido (no se duplica).'
          : 'Se descuenta el stock y se emite un solo remito. El cobro es en el local (sin pago online).'}
      </p>
    </div>
  )
}
