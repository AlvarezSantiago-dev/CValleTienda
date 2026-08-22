'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, MessageCircle, Truck, Package, Banknote } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatARS } from '@/lib/format'
import { formatDateTime } from '@/lib/datetime'
import { cambiarEstadoPedido, marcarPedidoVisto } from '@/app/actions/catalogo'
import { ConvertirPedidoModal } from './ConvertirPedidoModal'
import { EditarPedidoForm } from './EditarPedidoForm'
import { useRubro } from '@/components/layout/RubroProvider'
import type { EstadoPedidoCatalogo, PedidoCatalogo, PedidoCatalogoItem } from '@/types/database'
import type { MetodoPago } from '@/lib/configuracion/queries'
import { CatalogoPlaceholder } from '@/components/catalogo-publico/CatalogoPlaceholder'
import { cn } from '@/components/ui/cn'

const LABEL: Record<EstadoPedidoCatalogo, string> = {
  nuevo: 'Nuevo',
  visto: 'Recibido',
  confirmado: 'Aceptado',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  convertido: 'Cobrado',
}

const STEPS: { id: string; label: string; icon: typeof Package; estados: EstadoPedidoCatalogo[] }[] = [
  { id: 'recibido', label: 'Recibido', icon: Package, estados: ['nuevo', 'visto'] },
  { id: 'aceptado', label: 'Aceptado', icon: Check, estados: ['confirmado'] },
  { id: 'listo', label: 'Listo', icon: Truck, estados: ['listo'] },
  { id: 'cobrar', label: 'Cobrar', icon: Banknote, estados: ['entregado', 'convertido'] },
]

function stepIndex(estado: EstadoPedidoCatalogo): number {
  if (estado === 'cancelado') return -1
  const i = STEPS.findIndex((s) => s.estados.includes(estado))
  return i
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
  const { usarPedidoCc } = useRubro()
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
  const cerrado = pedido.estado === 'convertido' || pedido.estado === 'cancelado'
  const activo = stepIndex(pedido.estado)

  const cta =
    pedido.estado === 'nuevo' || pedido.estado === 'visto'
      ? { label: 'Aceptar pedido', estado: 'confirmado' as const }
      : pedido.estado === 'confirmado'
        ? { label: 'Marcar listo', estado: 'listo' as const }
        : pedido.estado === 'listo'
          ? { label: 'Marcar entregado', estado: 'entregado' as const }
          : null

  return (
    <div className="space-y-6 pb-28 sm:pb-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={
            pedido.estado === 'cancelado'
              ? 'danger'
              : pedido.estado === 'convertido'
                ? 'success'
                : pedido.estado === 'nuevo'
                  ? 'brand'
                  : 'info'
          }
        >
          {LABEL[pedido.estado]}
        </Badge>
        {usarPedidoCc && (
          <Badge variant={pedido.condicion_pago === 'cuenta_corriente' ? 'warning' : 'neutral'}>
            {pedido.condicion_pago === 'cuenta_corriente' ? 'A cuenta' : 'Contado'}
          </Badge>
        )}
        <span className="text-xs text-fg-muted">{formatDateTime(pedido.created_at)}</span>
      </div>

      {!cerrado && (
        <ol className="grid grid-cols-4 gap-1">
          {STEPS.map((s, i) => {
            const done = activo > i || pedido.estado === 'convertido'
            const current = activo === i && pedido.estado !== 'convertido'
            const Icon = s.icon
            return (
              <li key={s.id} className="flex flex-col items-center gap-1.5 text-center">
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full border',
                    done && 'bg-primary border-primary text-primary-fg',
                    current && 'bg-primary-soft border-primary text-fg-brand',
                    !done && !current && 'bg-surface border-border-default text-fg-muted'
                  )}
                >
                  <Icon size={16} aria-hidden />
                </span>
                <span
                  className={cn(
                    'text-[11px] font-medium leading-tight',
                    current || done ? 'text-fg' : 'text-fg-muted'
                  )}
                >
                  {s.label}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      <section className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium text-fg">{pedido.cliente_nombre}</p>
            <p className="text-sm text-fg-muted">{pedido.cliente_telefono}</p>
            <p className="text-sm text-fg-muted mt-1">
              {pedido.tipo_entrega === 'envio'
                ? `Envío: ${pedido.direccion_entrega ?? '—'}`
                : 'Retiro en el local'}
            </p>
            {pedido.notas && <p className="text-sm text-fg-muted">Notas: {pedido.notas}</p>}
          </div>
          <a
            href={waCliente}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-md)] border border-border-default px-3 text-sm font-medium text-fg-brand hover:bg-primary-soft focus-ring shrink-0"
          >
            <MessageCircle size={16} aria-hidden />
            WhatsApp
          </a>
        </div>
      </section>

      {puedeEditar ? (
        <EditarPedidoForm pedido={pedido} items={items} recargoCcDefault={recargoCcDefault} />
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex gap-3 items-center text-sm rounded-[var(--radius-md)] border border-border-subtle bg-surface p-2.5"
              >
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

      {puedeConvertir && (
        <section className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface p-4 space-y-2">
          <p className="text-sm font-medium text-fg">Registrar venta</p>
          <ConvertirPedidoModal
            pedido={pedido}
            items={items}
            metodos={metodos}
            cajaAbierta={cajaAbierta}
            redondeoEfectivoActivo={redondeoEfectivoActivo}
            recargoCcDefault={recargoCcDefault}
          />
        </section>
      )}

      {!cerrado && (
        <div className="flex flex-wrap gap-2">
          {cta && (
            <Button size="sm" disabled={pending} onClick={() => setEstado(cta.estado)}>
              {cta.label}
            </Button>
          )}
          <Button variant="danger" size="sm" disabled={pending} onClick={() => setEstado('cancelado')}>
            Cancelar pedido
          </Button>
        </div>
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

      {!cerrado && cta && (
        <div className="fixed bottom-0 inset-x-0 z-(--z-nav) border-t border-border-default bg-surface/95 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden">
          <div className="px-4 pt-3">
            <Button
              type="button"
              className="w-full"
              disabled={pending}
              onClick={() => setEstado(cta.estado)}
            >
              {cta.label}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
