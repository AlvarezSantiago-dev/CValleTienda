'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, MessageCircle, Banknote, Package } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatARS } from '@/lib/format'
import { formatDateTime } from '@/lib/datetime'
import { aceptarPedidoCatalogo, cambiarEstadoPedido, marcarPedidoVisto } from '@/app/actions/catalogo'
import { ConvertirPedidoModal } from './ConvertirPedidoModal'
import { EditarPedidoForm, type PedidoEditState } from './EditarPedidoForm'
import { useRubro } from '@/components/layout/RubroProvider'
import type { EstadoPedidoCatalogo, PedidoCatalogo, PedidoCatalogoItem } from '@/types/database'
import type { MetodoPago } from '@/lib/configuracion/queries'
import { CatalogoPlaceholder } from '@/components/catalogo-publico/CatalogoPlaceholder'
import { BotonDescargarDoc } from '@/components/documentos/BotonDescargarDoc'
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

const STEPS_REMITO: { id: string; label: string; icon: typeof Package; estados: EstadoPedidoCatalogo[] }[] = [
  { id: 'recibido', label: 'Recibido', icon: Package, estados: ['nuevo', 'visto'] },
  { id: 'aceptado', label: 'Aceptado', icon: Check, estados: ['confirmado'] },
  { id: 'cobrar', label: 'Cobrar', icon: Banknote, estados: ['listo', 'entregado', 'convertido'] },
]

const STEPS_CLASICO: { id: string; label: string; icon: typeof Package; estados: EstadoPedidoCatalogo[] }[] = [
  { id: 'recibido', label: 'Recibido', icon: Package, estados: ['nuevo', 'visto'] },
  { id: 'aceptado', label: 'Aceptado', icon: Check, estados: ['confirmado'] },
  { id: 'listo', label: 'Listo', icon: Banknote, estados: ['listo'] },
  { id: 'cobrar', label: 'Cobrar', icon: Banknote, estados: ['entregado', 'convertido'] },
]

function stepIndex(
  estado: EstadoPedidoCatalogo,
  steps: { id: string; estados: EstadoPedidoCatalogo[] }[]
): number {
  if (estado === 'cancelado') return -1
  return steps.findIndex((s) => s.estados.includes(estado))
}

const BARRA_CLS =
  'fixed inset-x-0 z-(--z-nav) border-t border-border-default bg-surface/95 backdrop-blur-sm bottom-[calc(4rem+env(safe-area-inset-bottom))] pb-3 pt-3'

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
  const { usarPedidoCc, usarRemitos } = useRubro()
  const [pending, start] = useTransition()
  const [edit, setEdit] = useState<PedidoEditState | null>(null)
  const [cobroOpen, setCobroOpen] = useState(false)
  const [aceptarError, setAceptarError] = useState<string | null>(null)

  const onEditState = useCallback((s: PedidoEditState) => {
    setEdit((prev) => {
      if (
        prev &&
        prev.dirty === s.dirty &&
        prev.pending === s.pending &&
        prev.error === s.error &&
        prev.total === s.total &&
        prev.guardar === s.guardar
      ) {
        return prev
      }
      return s
    })
  }, [])

  useEffect(() => {
    if (pedido.estado !== 'nuevo') return
    void marcarPedidoVisto(pedido.id).then(() => router.refresh())
  }, [pedido.id, pedido.estado, router])

  const steps = usarRemitos ? STEPS_REMITO : STEPS_CLASICO
  const puedeConvertir = ['confirmado', 'listo', 'entregado'].includes(pedido.estado)
  const puedeEditar =
    !pedido.venta_id && ['nuevo', 'visto', 'confirmado', 'listo'].includes(pedido.estado)
  const cerrado = pedido.estado === 'convertido' || pedido.estado === 'cancelado'
  const activo = stepIndex(pedido.estado, steps)
  const recibido = pedido.estado === 'nuevo' || pedido.estado === 'visto'

  function setEstado(estado: EstadoPedidoCatalogo) {
    start(async () => {
      const res = await cambiarEstadoPedido(pedido.id, estado)
      if (!res.ok) toast.error(res.error ?? 'No se pudo cambiar el estado')
      router.refresh()
    })
  }

  function aceptar() {
    setAceptarError(null)
    start(async () => {
      const res = await aceptarPedidoCatalogo(pedido.id)
      if (!res.ok) {
        setAceptarError(res.error ?? 'No se pudo aceptar')
        toast.error(res.error ?? 'No se pudo aceptar')
        return
      }
      toast.success(res.data?.remitoId ? 'Pedido aceptado · remito emitido' : 'Pedido aceptado')
      router.refresh()
    })
  }

  const waCliente = `https://wa.me/${pedido.cliente_telefono.replace(/\D/g, '')}`
  const dirty = Boolean(edit?.dirty)
  const barGuardar = puedeEditar && dirty
  const barAceptar = !dirty && recibido && !cerrado
  const ctaClasico =
    !usarRemitos && pedido.estado === 'confirmado'
      ? { label: 'Marcar listo', estado: 'listo' as const }
      : !usarRemitos && pedido.estado === 'listo'
        ? { label: 'Marcar entregado', estado: 'entregado' as const }
        : null
  const barConfirmar = !dirty && puedeConvertir && !cerrado && !ctaClasico

  return (
    <div className="space-y-6 pb-[calc(8rem+env(safe-area-inset-bottom))]">
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
        <ol className={cn('grid gap-1', usarRemitos ? 'grid-cols-3' : 'grid-cols-4')}>
          {steps.map((s, i) => {
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

      {pedido.remito_id && !pedido.venta_id && (
        <section className="rounded-[var(--radius-lg)] border border-primary-border bg-primary-soft/40 p-4 flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-fg flex-1 min-w-0">Remito emitido · stock aún no descontado</p>
          <Link
            href={`/remitos/${pedido.remito_id}`}
            className="inline-flex min-h-11 items-center px-3 text-sm font-medium text-fg-brand"
          >
            Abrir remito
          </Link>
          <BotonDescargarDoc href={`/api/documentos/remito/${pedido.remito_id}`} label="PDF" />
        </section>
      )}

      {puedeEditar ? (
        <EditarPedidoForm
          pedido={pedido}
          items={items}
          recargoCcDefault={recargoCcDefault}
          onEditState={onEditState}
        />
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
          <p className="text-sm font-medium text-fg hidden sm:block">
            {usarRemitos ? 'Confirmar remito' : 'Registrar venta'}
          </p>
          <ConvertirPedidoModal
            pedido={pedido}
            items={items}
            metodos={metodos}
            cajaAbierta={cajaAbierta}
            redondeoEfectivoActivo={redondeoEfectivoActivo}
            recargoCcDefault={recargoCcDefault}
            confirmarRemito={usarRemitos}
            open={cobroOpen}
            onOpenChange={setCobroOpen}
          />
        </section>
      )}

      {aceptarError && <p className="text-sm text-danger-soft-fg">{aceptarError}</p>}

      {!cerrado && (
        <div className="hidden sm:flex flex-wrap gap-2">
          {barGuardar && (
            <Button
              onClick={() => edit?.guardar()}
              disabled={edit?.pending || pending}
            >
              {edit?.pending ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          )}
          {barAceptar && (
            <Button disabled={pending} onClick={aceptar}>
              Aceptar pedido
            </Button>
          )}
          {ctaClasico && (
            <Button size="sm" disabled={pending} onClick={() => setEstado(ctaClasico.estado)}>
              {ctaClasico.label}
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

      {!cerrado && (
        <div className={cn(BARRA_CLS, 'sm:hidden')}>
          <div className="px-4 flex flex-col gap-2">
            {barGuardar ? (
              <Button
                type="button"
                className="w-full"
                disabled={edit?.pending || pending}
                onClick={() => edit?.guardar()}
              >
                {edit?.pending ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            ) : barAceptar ? (
              <Button type="button" className="w-full" disabled={pending} onClick={aceptar}>
                Aceptar pedido
              </Button>
            ) : ctaClasico ? (
              <Button
                type="button"
                className="w-full"
                disabled={pending}
                onClick={() => setEstado(ctaClasico.estado)}
              >
                {ctaClasico.label}
              </Button>
            ) : barConfirmar ? (
              <Button
                type="button"
                className="w-full"
                disabled={pending || !cajaAbierta}
                onClick={() => setCobroOpen(true)}
              >
                {usarRemitos ? 'Confirmar remito y cobrar' : 'Cobrar'}
              </Button>
            ) : null}
            {barConfirmar && !cajaAbierta && (
              <p className="text-xs text-center text-warning-soft-fg">
                Abrí la caja para cobrar.{' '}
                <a href="/caja" className="underline">
                  Ir a caja
                </a>
              </p>
            )}
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={pending}
              onClick={() => setEstado('cancelado')}
            >
              Cancelar pedido
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
