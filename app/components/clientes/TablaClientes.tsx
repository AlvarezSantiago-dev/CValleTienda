'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import type { ClienteListItem } from '@/lib/clientes/queries'
import { formatARS, formatDate, formatNumber } from '@/lib/format'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'

interface TablaClientesProps {
  items: ClienteListItem[]
  mostrarDeuda?: boolean
}

export function TablaClientes({ items, mostrarDeuda = false }: TablaClientesProps) {
  const router = useRouter()

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Users size={20} aria-hidden />}
        title="Sin clientes que coincidan"
        description="Probá cambiando los filtros o la búsqueda."
      />
    )
  }

  const columns: DataTableColumn<ClienteListItem>[] = [
    {
      id: 'nombre',
      header: 'Nombre',
      mobilePrimary: true,
      cell: (c) => {
        const nombreCompleto = `${c.nombre}${c.apellido ? ' ' + c.apellido : ''}`
        return (
          <span className="font-medium text-fg">
            {nombreCompleto}
            {c.tiene_notas && (
              <span className="ml-1 text-[11px] text-fg-subtle" title="Tiene notas">
                📝
              </span>
            )}
          </span>
        )
      },
    },
    {
      id: 'dni',
      header: 'DNI',
      cell: (c) => c.dni ?? '—',
    },
    {
      id: 'telefono',
      header: 'Teléfono',
      cell: (c) => c.telefono ?? '—',
    },
    {
      id: 'ciudad',
      header: 'Ciudad',
      cell: (c) => c.ciudad ?? '—',
    },
    {
      id: 'compras',
      header: 'Compras',
      align: 'right',
      cell: (c) => formatNumber(c.total_compras),
    },
    {
      id: 'monto',
      header: 'Monto',
      align: 'right',
      cell: (c) => (
        <span className="font-medium text-fg tabular-nums">{formatARS(c.monto_total)}</span>
      ),
    },
    ...(mostrarDeuda
      ? [
          {
            id: 'deuda',
            header: 'Deuda',
            align: 'right' as const,
            cell: (c: ClienteListItem) =>
              c.saldo_cc > 0.01 ? (
                <span className="font-semibold text-warning-soft-fg tabular-nums">
                  {formatARS(c.saldo_cc)}
                </span>
              ) : (
                <span className="text-fg-subtle">—</span>
              ),
          },
        ]
      : []),
    {
      id: 'ultima',
      header: 'Última compra',
      cell: (c) => formatDate(c.ultima_compra),
    },
    {
      id: 'estado',
      header: 'Estado',
      cell: (c) => (
        <Badge variant={c.activo ? 'success' : 'neutral'}>
          {c.activo ? 'Activo' : 'Inactivo'}
        </Badge>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={items}
      rowKey={(c) => c.id}
      onRowClick={(c) => router.push(`/clientes/${c.id}`)}
      rowActions={(c) => (
        <Link
          href={`/clientes/${c.id}`}
          className="text-xs text-fg-brand hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          Ver →
        </Link>
      )}
    />
  )
}
