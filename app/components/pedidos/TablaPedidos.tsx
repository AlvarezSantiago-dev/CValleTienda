'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageCircle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatARS } from '@/lib/format'
import { formatDateTime } from '@/lib/datetime'
import { useRubro } from '@/components/layout/RubroProvider'
import type { PedidoCatalogo, EstadoPedidoCatalogo } from '@/types/database'

const ESTADO_LABEL: Record<EstadoPedidoCatalogo, string> = {
  nuevo: 'Nuevo',
  visto: 'Visto',
  confirmado: 'Aceptado',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  convertido: 'Venta',
}

const ESTADO_VAR: Record<EstadoPedidoCatalogo, 'brand' | 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  nuevo: 'brand',
  visto: 'info',
  confirmado: 'warning',
  listo: 'success',
  entregado: 'success',
  cancelado: 'danger',
  convertido: 'neutral',
}

function waCliente(tel: string) {
  return `https://wa.me/${tel.replace(/\D/g, '')}`
}

export function TablaPedidos({ pedidos }: { pedidos: PedidoCatalogo[] }) {
  const router = useRouter()
  const { usarPedidoCc } = useRubro()

  if (pedidos.length === 0) {
    return (
      <EmptyState
        title="No hay pedidos"
        description="Cuando un cliente pida desde el catálogo, aparecen acá."
      />
    )
  }

  const columns: DataTableColumn<PedidoCatalogo>[] = [
    {
      id: 'numero',
      header: 'Pedido',
      mobilePrimary: true,
      cell: (p) => (
        <div className="flex items-center gap-2 min-w-0">
          {p.estado === 'nuevo' && (
            <span className="h-2 w-2 rounded-full bg-primary shrink-0" aria-hidden />
          )}
          <Link
            href={`/pedidos/${p.id}`}
            className="font-medium text-fg hover:text-fg-brand"
            onClick={(e) => e.stopPropagation()}
          >
            #{p.numero}
          </Link>
        </div>
      ),
    },
    {
      id: 'cliente',
      header: 'Cliente',
      cell: (p) => (
        <div>
          <div className="text-sm text-fg">{p.cliente_nombre}</div>
          <div className="text-xs text-fg-muted">{p.cliente_telefono}</div>
        </div>
      ),
    },
    {
      id: 'entrega',
      header: 'Entrega',
      cell: (p) => (
        <div className="space-y-0.5">
          <div>{p.tipo_entrega === 'envio' ? 'Envío' : 'Retiro'}</div>
          {(p.items_count ?? 0) > 0 && (
            <div className="text-xs text-fg-muted">
              {p.items_count} {p.items_count === 1 ? 'ítem' : 'ítems'}
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: (p) => (
        <div className="flex flex-wrap gap-1 justify-end md:justify-start">
          <Badge variant={ESTADO_VAR[p.estado]}>{ESTADO_LABEL[p.estado]}</Badge>
          {usarPedidoCc && p.condicion_pago === 'cuenta_corriente' && (
            <Badge variant="warning">A cuenta</Badge>
          )}
        </div>
      ),
    },
    {
      id: 'total',
      header: 'Total',
      align: 'right',
      cell: (p) => <span className="font-mono tabular-nums">{formatARS(p.total)}</span>,
    },
    {
      id: 'fecha',
      header: 'Fecha',
      cell: (p) => <span className="text-xs text-fg-muted">{formatDateTime(p.created_at)}</span>,
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={pedidos}
      rowKey={(p) => p.id}
      onRowClick={(p) => router.push(`/pedidos/${p.id}`)}
      rowClassName={(p) =>
        p.estado === 'nuevo' ? 'bg-primary-soft/50 border-primary/30' : ''
      }
      rowActions={(p) => (
        <a
          href={waCliente(p.cliente_telefono)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-fg-brand hover:bg-primary-soft focus-ring"
          aria-label={`WhatsApp a ${p.cliente_nombre}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MessageCircle size={18} aria-hidden />
        </a>
      )}
    />
  )
}
