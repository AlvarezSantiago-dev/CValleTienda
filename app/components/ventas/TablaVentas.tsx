'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Receipt } from 'lucide-react'
import type { VentaListItem } from '@/lib/ventas/queries'
import { formatDateTime } from '@/lib/datetime'
import { formatNumeroTicket } from '@/lib/tickets/format'
import { AnularVentaInlineButton } from '@/components/ventas/AnularVentaInlineButton'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { Badge, estadoVentaBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

interface Props {
  ventas: VentaListItem[]
  prefijoTicket: string
}

export function TablaVentas({ ventas, prefijoTicket }: Props) {
  const router = useRouter()

  if (ventas.length === 0) {
    return (
      <EmptyState
        icon={<Receipt size={20} aria-hidden />}
        title="Todavía no hay ventas"
        description="Cuando registres una venta desde el POS aparecerá acá."
        cta={{ label: 'Ir al POS', href: '/pos' }}
      />
    )
  }

  const columns: DataTableColumn<VentaListItem>[] = [
    {
      id: 'ticket',
      header: 'Ticket',
      mobilePrimary: true,
      cell: (v) => (
        <span className="font-semibold text-fg">
          {formatNumeroTicket(prefijoTicket, v.numero_ticket)}
        </span>
      ),
    },
    {
      id: 'fecha',
      header: 'Fecha',
      cell: (v) => formatDateTime(v.created_at),
    },
    {
      id: 'cliente',
      header: 'Cliente',
      cell: (v) => v.cliente_nombre ?? '—',
    },
    {
      id: 'vendedor',
      header: 'Vendedor',
      cell: (v) => v.usuario_nombre ?? '—',
    },
    {
      id: 'items',
      header: 'Items',
      align: 'right',
      cell: (v) => <span className="font-mono tabular-nums">{v.cantidad_items}</span>,
    },
    {
      id: 'total',
      header: 'Total',
      align: 'right',
      cell: (v) => (
        <div>
          <span className="font-semibold font-mono tabular-nums text-fg">{formatARS(v.total)}</span>
          {v.descuento > 0 && (
            <p className="text-[11px] text-fg-subtle font-mono tabular-nums">
              Dto. {formatARS(v.descuento)}
            </p>
          )}
          {v.total_devuelto > 0 && (
            <p className="text-[11px] text-warning-soft-fg font-mono tabular-nums">
              Devuelto {formatARS(v.total_devuelto)} · Neto {formatARS(v.total - v.total_devuelto)}
            </p>
          )}
          {v.saldo_favor_usado > 0 && (
            <p className="text-[11px] text-success-soft-fg font-mono tabular-nums">
              Saldo a favor {formatARS(v.saldo_favor_usado)}
            </p>
          )}
        </div>
      ),
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: (v) => (
        <div className="flex flex-wrap gap-1">
          <Badge variant={estadoVentaBadge(v.estado === 'anulada' ? 'anulada' : v.estado)}>
            {v.estado === 'completada'
              ? 'Completada'
              : v.estado === 'anulada'
                ? 'Anulada'
                : v.estado}
          </Badge>
          {v.total_devuelto > 0 && <Badge variant="warning">Devolución</Badge>}
          {v.saldo_favor_usado > 0 && <Badge variant="success">Saldo a favor</Badge>}
        </div>
      ),
    },
    {
      id: 'comprobante',
      header: 'Comprobante',
      cell: (v) =>
        v.numero_comprobante ? (
          <Badge variant="brand">
            Fact. {v.tipo_comprobante}
          </Badge>
        ) : (
          <Badge variant="neutral">Ticket X</Badge>
        ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={ventas}
      rowKey={(v) => v.id}
      onRowClick={(v) => router.push(`/ventas/${v.id}`)}
      rowActions={(v) => (
        <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
          {v.estado === 'completada' && (
            <AnularVentaInlineButton
              ventaId={v.id}
              numeroTicket={v.numero_ticket}
              ticketLabel={formatNumeroTicket(prefijoTicket, v.numero_ticket)}
            />
          )}
          <Link href={`/ventas/${v.id}`} className="text-sm font-medium text-fg-brand hover:underline">
            Ver
          </Link>
        </div>
      )}
    />
  )
}
