'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatARS } from '@/lib/format'
import { formatDateTime } from '@/lib/datetime'
import { cambiarEstadoPedido, marcarPedidoVisto } from '@/app/actions/catalogo'
import { ConvertirPedidoModal } from './ConvertirPedidoModal'
import { EditarPedidoForm } from './EditarPedidoForm'
import type { EstadoPedidoCatalogo, PedidoCatalogo, PedidoCatalogoItem } from '@/types/database'
import type { MetodoPago } from '@/lib/configuracion/queries'
import { CatalogoPlaceholder } from '@/components/catalogo-publico/CatalogoPlaceholder'

const LABEL: Record<EstadoPedidoCatalogo, string> = {
  nuevo: 'Nuevo',
  visto: 'Visto',
  confirmado: 'Aceptado',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  convertido: 'Convertido a venta',
}

export function PedidoDetalle({
  pedido,
  items,
  metodos,
  cajaAbierta,
  redondeoEfectivoActivo,
  recargoCcDefault = 0,
}: {
  pedido: PedidoCatalogo
  items: PedidoCatalogoItem[]
  metodos: MetodoPago[]
  cajaAbierta: boolean
  redondeoEfectivoActivo: boolean
  recargoCcDefault?: number
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  useEffect(() => {
    if (pedido.estado !== 'nuevo') return
    void marcarPedidoVisto(pedido.id).then(() => router.refresh())
  }, [pedido.id, pedido.estado, router])

  function setEstado(estado: EstadoPedidoCatalogo) {
    start(async () => {
      await cambiarEstadoPedido(pedido.id, estado)
      router.refresh()
    })
  }

  const waCliente = `https://wa.me/${pedido.cliente_telefono.replace(/\D/g, '')}`
  const puedeConvertir = ['confirmado', 'listo', 'entregado'].includes(pedido.estado)
  const puedeEditar =
    !pedido.venta_id && ['nuevo', 'visto', 'confirmado', 'listo'].includes(pedido.estado)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{LABEL[pedido.estado]}</Badge>
        <span className="text-xs text-fg-muted">{formatDateTime(pedido.created_at)}</span>
      </div>

      <section className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface p-4 space-y-1 text-sm">
        <p className="font-medium text-fg">{pedido.cliente_nombre}</p>
        <a href={waCliente} className="text-fg-brand" target="_blank" rel="noreferrer">
          {pedido.cliente_telefono}
        </a>
        <p className="text-fg-muted">
          {pedido.tipo_entrega === 'envio'
            ? `Envío: ${pedido.direccion_entrega ?? '—'}`
            : 'Retiro en el local'}
        </p>
        {pedido.notas && <p className="text-fg-muted">Notas: {pedido.notas}</p>}
      </section>

      {puedeEditar ? (
        <EditarPedidoForm pedido={pedido} items={items} />
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((it) => (
              <li key={it.id} className="flex gap-3 items-center text-sm">
                <div className="h-12 w-12 rounded-[var(--radius-md)] overflow-hidden bg-surface-sunken shrink-0">
                  {it.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.imagen_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <CatalogoPlaceholder nombre={it.producto_nombre} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-fg truncate">{it.producto_nombre}</p>
                  <p className="text-xs text-fg-muted">
                    {[it.color, it.talla].filter(Boolean).join(' · ')} ×{it.cantidad}
                  </p>
                </div>
                <span className="tabular-nums">{formatARS(it.total_linea)}</span>
              </li>
            ))}
          </ul>
          <p className="text-right font-semibold tabular-nums">{formatARS(pedido.total)}</p>
        </>
      )}

      {pedido.estado !== 'convertido' && pedido.estado !== 'cancelado' && (
        <div className="flex flex-wrap gap-2">
          {pedido.estado === 'nuevo' && (
            <>
              <Button variant="secondary" size="sm" disabled={pending} onClick={() => setEstado('visto')}>
                Marcar visto
              </Button>
              <Button size="sm" disabled={pending} onClick={() => setEstado('confirmado')}>
                Aceptar pedido
              </Button>
            </>
          )}
          {pedido.estado === 'visto' && (
            <Button size="sm" disabled={pending} onClick={() => setEstado('confirmado')}>
              Aceptar pedido
            </Button>
          )}
          {pedido.estado === 'confirmado' && (
            <Button size="sm" disabled={pending} onClick={() => setEstado('listo')}>
              Marcar listo
            </Button>
          )}
          {pedido.estado === 'listo' && (
            <Button size="sm" disabled={pending} onClick={() => setEstado('entregado')}>
              Marcar entregado
            </Button>
          )}
          <Button variant="danger" size="sm" disabled={pending} onClick={() => setEstado('cancelado')}>
            Cancelar
          </Button>
        </div>
      )}

      {puedeConvertir && (
        <ConvertirPedidoModal
          pedido={pedido}
          metodos={metodos}
          cajaAbierta={cajaAbierta}
          redondeoEfectivoActivo={redondeoEfectivoActivo}
          recargoCcDefault={recargoCcDefault}
        />
      )}

      {pedido.venta_id && (
        <p className="text-sm">
          Venta:{' '}
          <Link href={`/ventas/${pedido.venta_id}`} className="text-fg-brand">
            ver ticket
          </Link>
          {pedido.remito_id && (
            <>
              {' · '}
              <Link href={`/remitos/${pedido.remito_id}`} className="text-fg-brand">
                remito
              </Link>
            </>
          )}
        </p>
      )}
    </div>
  )
}
