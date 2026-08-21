'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/Badge'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatARS } from '@/lib/format'
import { formatDateTime } from '@/lib/datetime'
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

export function TablaPedidos({ pedidos }: { pedidos: PedidoCatalogo[] }) {
  const router = useRouter()
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
        <Link href={`/pedidos/${p.id}`} className="font-medium text-fg hover:text-fg-brand" onClick={(e) => e.stopPropagation()}>
          #{p.numero}
        </Link>
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
      cell: (p) => (p.tipo_entrega === 'envio' ? 'Envío' : 'Retiro'),
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: (p) => <Badge variant={ESTADO_VAR[p.estado]}>{ESTADO_LABEL[p.estado]}</Badge>,
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
    />
  )
}
