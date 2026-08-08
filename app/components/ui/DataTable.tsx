import { type ReactNode } from 'react'
import { cn } from './cn'
import { EmptyState } from './EmptyState'
import { SkeletonRow } from './Skeleton'

export interface DataTableColumn<T> {
  /** Clave única */
  id: string
  /** Encabezado de columna */
  header: ReactNode
  /** Celda desktop */
  cell: (row: T) => ReactNode
  /** Label para card mobile (si omitido, usa header como string) */
  mobileLabel?: string
  /** Si false, no aparece en la card mobile (default true) */
  mobile?: boolean
  /** Alineación */
  align?: 'left' | 'right' | 'center'
  /** Clase extra del th/td */
  className?: string
  /** Prioridad en mobile: primary se muestra como título de la card */
  mobilePrimary?: boolean
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  /** Clave estable por fila */
  rowKey: (row: T) => string
  loading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  emptyIcon?: ReactNode
  emptyAction?: ReactNode
  /** Click en fila */
  onRowClick?: (row: T) => void
  className?: string
  /** Acciones por fila (aparecen a la derecha en desktop y en card mobile) */
  rowActions?: (row: T) => ReactNode
}

const alignClass = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
} as const

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyTitle = 'Sin resultados',
  emptyDescription,
  emptyIcon,
  emptyAction,
  onRowClick,
  className = '',
  rowActions,
}: DataTableProps<T>) {
  const mobileCols = columns.filter((c) => c.mobile !== false)
  const primaryCol = mobileCols.find((c) => c.mobilePrimary) ?? mobileCols[0]
  const secondaryCols = mobileCols.filter((c) => c !== primaryCol)

  if (!loading && rows.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={emptyIcon}
        action={emptyAction}
      />
    )
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-[var(--radius-lg)] border border-border-subtle bg-surface shadow-xs">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-sunken border-b border-border-subtle">
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={cn(
                    'px-4 py-3 font-medium text-fg-muted whitespace-nowrap',
                    alignClass[col.align ?? 'left'],
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
              {rowActions && <th scope="col" className="px-4 py-3 w-12"><span className="sr-only">Acciones</span></th>}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={i} cols={columns.length + (rowActions ? 1 : 0)} />
                ))
              : rows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      'border-b border-border-subtle last:border-0 transition-colors duration-(--duration-fast)',
                      onRowClick && 'cursor-pointer hover:bg-surface-hover'
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        className={cn(
                          'px-4 py-3 text-fg align-middle',
                          alignClass[col.align ?? 'left'],
                          col.className
                        )}
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                    {rowActions && (
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {rowActions(row)}
                      </td>
                    )}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface p-4 space-y-3 animate-pulse"
              >
                <div className="h-4 w-2/3 bg-surface-sunken rounded" />
                <div className="h-3 w-full bg-surface-sunken rounded" />
                <div className="h-3 w-1/2 bg-surface-sunken rounded" />
              </div>
            ))
          : rows.map((row) => (
              <div
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'rounded-[var(--radius-lg)] border border-border-subtle bg-surface p-4 shadow-xs',
                  onRowClick && 'cursor-pointer active:bg-surface-hover'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {primaryCol && (
                      <div className="font-medium text-fg truncate">{primaryCol.cell(row)}</div>
                    )}
                    <dl className="mt-2 space-y-1.5">
                      {secondaryCols.map((col) => (
                        <div key={col.id} className="flex justify-between gap-3 text-sm">
                          <dt className="text-fg-muted shrink-0">
                            {col.mobileLabel ??
                              (typeof col.header === 'string' ? col.header : col.id)}
                          </dt>
                          <dd className={cn('text-fg text-right truncate', col.className)}>
                            {col.cell(row)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  {rowActions && (
                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      {rowActions(row)}
                    </div>
                  )}
                </div>
              </div>
            ))}
      </div>
    </div>
  )
}
