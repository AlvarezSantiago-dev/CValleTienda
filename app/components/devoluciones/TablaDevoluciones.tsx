'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { DevolucionListItem } from '@/lib/devoluciones/queries'
import { formatARS, formatDateTime } from '@/lib/format'
import { formatNumeroTicket } from '@/lib/tickets/format'
import { PrintDevolucionCell } from '@/components/devoluciones/PrintDevolucionCell'
import {
  RESOLUCION_LABEL,
  RESOLUCION_DESCRIPCION,
  RESOLUCION_BADGE_CLASS,
} from '@/lib/devoluciones/resolucion-labels'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

interface TablaDevolucionesProps {
  items: DevolucionListItem[]
  contexto?: 'global' | 'venta'
  showPrint?: boolean
  prefijoTicket?: string
}

export function TablaDevoluciones({
  items,
  contexto = 'global',
  showPrint = false,
  prefijoTicket = 'T',
}: TablaDevolucionesProps) {
  const router = useRouter()

  if (items.length === 0) {
    return (
      <EmptyState
        title="Sin devoluciones"
        description="Sin devoluciones que coincidan con los filtros."
      />
    )
  }

  const columns: DataTableColumn<DevolucionListItem>[] = [
    {
      id: 'numero',
      header: '#',
      mobilePrimary: true,
      cell: (d) => (
        <span className="font-mono text-xs text-fg">#{d.numero_devolucion}</span>
      ),
    },
    {
      id: 'fecha',
      header: 'Fecha',
      cell: (d) => formatDateTime(d.created_at),
    },
    ...(contexto === 'global'
      ? [
          {
            id: 'venta',
            header: 'Venta',
            cell: (d: DevolucionListItem) => (
              <Link
                href={`/ventas/${d.venta_id}`}
                className="font-mono text-xs text-fg-brand hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                Venta{' '}
                {d.numero_ticket != null
                  ? formatNumeroTicket(prefijoTicket, d.numero_ticket)
                  : '—'}
              </Link>
            ),
          } satisfies DataTableColumn<DevolucionListItem>,
          {
            id: 'cliente',
            header: 'Cliente',
            cell: (d: DevolucionListItem) => d.cliente_nombre ?? '—',
          } satisfies DataTableColumn<DevolucionListItem>,
        ]
      : []),
    {
      id: 'tipo',
      header: 'Tipo',
      cell: (d) => (
        <Badge variant={d.tipo === 'total' ? 'warning' : 'info'}>
          {d.tipo === 'total' ? 'Total' : 'Parcial'}
        </Badge>
      ),
    },
    {
      id: 'resolucion',
      header: 'Resolución',
      cell: (d) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${RESOLUCION_BADGE_CLASS[d.tipo_resolucion]}`}
          title={RESOLUCION_DESCRIPCION[d.tipo_resolucion]}
        >
          {RESOLUCION_LABEL[d.tipo_resolucion]}
        </span>
      ),
    },
    {
      id: 'items',
      header: 'Items',
      align: 'right',
      cell: (d) => <span className="font-mono tabular-nums">{d.cantidad_items}</span>,
    },
    {
      id: 'total',
      header: 'Total',
      align: 'right',
      cell: (d) => (
        <span className="font-semibold font-mono tabular-nums text-warning-soft-fg">
          {formatARS(d.total_devuelto)}
        </span>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={items}
      rowKey={(d) => d.id}
      onRowClick={(d) => router.push(`/devoluciones/${d.id}`)}
      rowActions={(d) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          {showPrint && <PrintDevolucionCell id={d.id} />}
          <Link
            href={`/devoluciones/${d.id}`}
            className="text-xs font-medium text-fg-brand hover:underline"
          >
            Ver →
          </Link>
        </div>
      )}
    />
  )
}
