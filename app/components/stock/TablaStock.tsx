'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { VarianteStockItem } from '@/lib/stock/queries'
import { formatARS, formatNumber, formatSignedDelta } from '@/lib/format'
import { AlertaStockBajo } from './AlertaStockBajo'
import { useRubro } from '@/components/layout/RubroProvider'
import { formatStockDisplay } from '@/lib/stock/infinito'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/components/ui/cn'

interface TablaStockProps {
  items: VarianteStockItem[]
}

export function TablaStock({ items }: TablaStockProps) {
  const router = useRouter()
  const { labelVar1, labelVar2, usarVar1, usarVar2 } = useRubro()

  if (items.length === 0) {
    return (
      <EmptyState
        title="Sin variantes"
        description="No hay variantes que coincidan con los filtros aplicados."
      />
    )
  }

  const varHeader =
    usarVar1 && usarVar2
      ? `${labelVar1} / ${labelVar2}`
      : usarVar1
        ? labelVar1
        : labelVar2

  const columns: DataTableColumn<VarianteStockItem>[] = [
    {
      id: 'producto',
      header: 'Producto',
      mobilePrimary: true,
      cell: (it) => (
        <div>
          <div className="font-medium text-fg">{it.producto_nombre}</div>
          {it.codigo_base && <div className="text-xs text-fg-muted">{it.codigo_base}</div>}
        </div>
      ),
    },
    ...(usarVar1 || usarVar2
      ? [
          {
            id: 'variante',
            header: varHeader,
            cell: (it: VarianteStockItem) => (
              <div className="flex items-center gap-2 text-fg-muted">
                {usarVar2 && it.color_hex && (
                  <span
                    className="h-3 w-3 rounded-full border border-border-default shrink-0"
                    style={{ backgroundColor: it.color_hex }}
                  />
                )}
                <span>
                  {[usarVar1 ? it.talla : null, usarVar2 ? it.color : null]
                    .filter(Boolean)
                    .join(' / ') || '—'}
                </span>
              </div>
            ),
          } satisfies DataTableColumn<VarianteStockItem>,
        ]
      : []),
    {
      id: 'codigo',
      header: 'Código',
      cell: (it) => (
        <span className="font-mono text-xs text-fg-muted">{it.codigo_barras ?? '—'}</span>
      ),
    },
    {
      id: 'precio',
      header: 'Precio',
      align: 'right',
      cell: (it) => (
        <span className="font-mono tabular-nums">
          {it.precio_venta != null ? formatARS(it.precio_venta) : '—'}
        </span>
      ),
    },
    {
      id: 'stock',
      header: 'Stock',
      align: 'right',
      cell: (it) => (
        <div className="flex items-center justify-end gap-2">
          <AlertaStockBajo stockActual={it.stock_actual} stockMinimo={it.stock_minimo} />
          <span className="font-semibold text-fg font-mono tabular-nums">
            {formatStockDisplay(it.stock_actual)}
            {it.unidad_de_medida !== 'unidad' && (
              <span className="ml-1 text-xs font-normal text-fg-muted">{it.unidad_de_medida}</span>
            )}
          </span>
        </div>
      ),
    },
    {
      id: 'minimo',
      header: 'Mínimo',
      align: 'right',
      cell: (it) =>
        it.stock_minimo > 0
          ? `${formatNumber(it.stock_minimo)}${it.unidad_de_medida !== 'unidad' ? ` ${it.unidad_de_medida}` : ''}`
          : '—',
    },
    {
      id: 'dif',
      header: 'Diferencia',
      align: 'right',
      cell: (it) => {
        const diferencia = it.stock_actual - it.stock_minimo
        if (it.stock_minimo <= 0) return '—'
        return (
          <span
            className={cn(
              'font-mono tabular-nums',
              diferencia <= 0 ? 'text-danger-soft-fg font-medium' : 'text-fg-muted'
            )}
          >
            {formatSignedDelta(diferencia)}
          </span>
        )
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={items}
      rowKey={(it) => it.id}
      onRowClick={(it) => router.push(`/stock/${it.id}`)}
      rowActions={(it) => (
        <Link
          href={`/stock/${it.id}`}
          className="text-xs font-medium text-fg-brand hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Ajustar →
        </Link>
      )}
    />
  )
}
