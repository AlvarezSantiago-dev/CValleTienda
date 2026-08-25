'use client'

import Link from 'next/link'
import type { MovimientoStockItem } from '@/lib/stock/queries'
import { formatDateTime, formatSignedDelta } from '@/lib/format'
import { formatStockDisplay } from '@/lib/stock/infinito'
import { useRubro } from '@/components/layout/RubroProvider'
import { rubroPermiteStockInfinito } from '@/lib/rubro/config'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/components/ui/cn'

interface MovimientosTablaProps {
  items: MovimientoStockItem[]
  mostrarVariante?: boolean
}

const tipoVariant: Record<string, BadgeVariant> = {
  entrada: 'brand',
  salida: 'danger',
  ajuste: 'neutral',
  devolucion: 'warning',
  inicial: 'info',
}

const tipoLabel: Record<string, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
  devolucion: 'Devolución',
  inicial: 'Inicial',
}

export function MovimientosTabla({
  items,
  mostrarVariante = true,
}: MovimientosTablaProps) {
  const { rubro } = useRubro()
  const permiteInfinito = rubroPermiteStockInfinito(rubro)

  if (items.length === 0) {
    return (
      <EmptyState
        title="Sin movimientos"
        description="No hay movimientos registrados con los filtros actuales."
      />
    )
  }

  const columns: DataTableColumn<MovimientoStockItem>[] = [
    {
      id: 'fecha',
      header: 'Fecha',
      mobilePrimary: !mostrarVariante,
      cell: (m) => (
        <span className="text-fg whitespace-nowrap text-sm">{formatDateTime(m.created_at)}</span>
      ),
    },
    {
      id: 'tipo',
      header: 'Tipo',
      cell: (m) => (
        <Badge variant={tipoVariant[m.tipo] ?? 'neutral'}>
          {tipoLabel[m.tipo] ?? m.tipo}
        </Badge>
      ),
    },
    ...(mostrarVariante
      ? [
          {
            id: 'variante',
            header: 'Variante',
            mobilePrimary: true,
            cell: (m: MovimientoStockItem) => (
              <div>
                <Link
                  href={`/stock/${m.variante_id}`}
                  className="text-fg-brand hover:underline font-medium"
                >
                  {m.variante_nombre}
                </Link>
                {m.variante_label && (
                  <div className="text-xs text-fg-muted">{m.variante_label}</div>
                )}
              </div>
            ),
          } satisfies DataTableColumn<MovimientoStockItem>,
        ]
      : []),
    {
      id: 'cantidad',
      header: 'Cantidad',
      align: 'right',
      cell: (m) => (
        <span
          className={cn(
            'font-semibold font-mono tabular-nums',
            m.cantidad > 0
              ? 'text-success-soft-fg'
              : m.cantidad < 0
                ? 'text-danger-soft-fg'
                : 'text-fg'
          )}
        >
          {formatSignedDelta(m.cantidad)}
        </span>
      ),
    },
    {
      id: 'stock',
      header: 'Stock',
      align: 'right',
      mobileLabel: 'Anterior → Actual',
      cell: (m) => (
        <span className="font-mono tabular-nums text-sm text-fg-muted">
          {formatStockDisplay(m.stock_anterior, { permiteInfinito, corto: true })}
          {' → '}
          <strong className="text-fg">
            {formatStockDisplay(m.stock_posterior, { permiteInfinito, corto: true })}
          </strong>
        </span>
      ),
    },
    {
      id: 'motivo',
      header: 'Motivo',
      mobile: false,
      cell: (m) => (
        <div className="text-fg max-w-xs">
          {m.motivo ?? '—'}
          {m.venta_id && m.numero_ticket != null && (
            <div className="text-xs">
              <Link href={`/ventas/${m.venta_id}`} className="text-fg-brand hover:underline">
                Ticket #{m.numero_ticket}
              </Link>
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'usuario',
      header: 'Usuario',
      mobile: false,
      cell: (m) => <span className="text-fg">{m.usuario_nombre ?? '—'}</span>,
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={items}
      rowKey={(m) => m.id}
      emptyTitle="Sin movimientos"
    />
  )
}
