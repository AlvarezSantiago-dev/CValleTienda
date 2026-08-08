'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Receipt } from 'lucide-react'
import type { VentaListItem } from '@/lib/ventas/queries'
import { formatARS, formatDateTime } from '@/lib/format'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { Badge, estadoVentaBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

interface ClienteHistorialProps {
  ventas: VentaListItem[]
}

export function ClienteHistorial({ ventas }: ClienteHistorialProps) {
  const router = useRouter()

  if (ventas.length === 0) {
    return (
      <EmptyState
        icon={<Receipt size={20} aria-hidden />}
        title="Sin compras registradas"
        description="Este cliente todavía no tiene compras."
      />
    )
  }

  const columns: DataTableColumn<VentaListItem>[] = [
    {
      id: 'ticket',
      header: 'Ticket',
      mobilePrimary: true,
      cell: (v) => (
        <span className="font-mono text-xs text-fg">#{v.numero_ticket}</span>
      ),
    },
    {
      id: 'fecha',
      header: 'Fecha',
      cell: (v) => formatDateTime(v.created_at),
    },
    {
      id: 'items',
      header: 'Items',
      align: 'right',
      cell: (v) => v.cantidad_items,
    },
    {
      id: 'total',
      header: 'Total',
      align: 'right',
      cell: (v) => (
        <span
          className={`font-medium tabular-nums ${
            v.estado === 'anulada' ? 'text-fg-subtle line-through' : 'text-fg'
          }`}
        >
          {formatARS(v.total)}
        </span>
      ),
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: (v) => (
        <Badge variant={estadoVentaBadge(v.estado)}>
          {v.estado === 'anulada' ? 'Anulada' : 'Completada'}
        </Badge>
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
        <Link
          href={`/ventas/${v.id}`}
          className="text-xs text-fg-brand hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          Ver →
        </Link>
      )}
    />
  )
}
