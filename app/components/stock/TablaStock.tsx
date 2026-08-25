'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { VarianteStockItem } from '@/lib/stock/queries'
import { formatARS, formatNumber, formatSignedDelta } from '@/lib/format'
import { AlertaStockBajo } from './AlertaStockBajo'
import { StockAccionSheet } from './StockAccionSheet'
import { useRubro } from '@/components/layout/RubroProvider'
import { rubroPermiteStockInfinito } from '@/lib/rubro/config'
import { formatStockDisplay } from '@/lib/stock/infinito'
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'

interface TablaStockProps {
  items: VarianteStockItem[]
}

type AccionTarget = {
  varianteId: string
  productoNombre: string
  varianteLabel: string | null
  stockActual: number
  unidadDeMedida: string
  esBundle: boolean
  tab: 'ingreso' | 'ajuste'
}

function varianteLabel(it: VarianteStockItem, usarVar1: boolean, usarVar2: boolean) {
  return (
    [usarVar1 ? it.talla : null, usarVar2 ? it.color : null].filter(Boolean).join(' / ') || null
  )
}

export function TablaStock({ items }: TablaStockProps) {
  const router = useRouter()
  const { labelVar1, labelVar2, usarVar1, usarVar2, rubro } = useRubro()
  const permiteInfinito = rubroPermiteStockInfinito(rubro)
  const [accion, setAccion] = useState<AccionTarget | null>(null)

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

  function openAccion(it: VarianteStockItem, tab: 'ingreso' | 'ajuste') {
    setAccion({
      varianteId: it.id,
      productoNombre: it.producto_nombre,
      varianteLabel: varianteLabel(it, usarVar1, usarVar2),
      stockActual: it.stock_actual,
      unidadDeMedida: it.unidad_de_medida,
      esBundle: it.es_bundle,
      tab,
    })
  }

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
                <span>{varianteLabel(it, usarVar1, usarVar2) ?? '—'}</span>
              </div>
            ),
          } satisfies DataTableColumn<VarianteStockItem>,
        ]
      : []),
    {
      id: 'codigo',
      header: 'Código',
      mobile: false,
      cell: (it) => (
        <span className="font-mono text-xs text-fg-muted">{it.codigo_barras ?? '—'}</span>
      ),
    },
    {
      id: 'precio',
      header: 'Precio',
      align: 'right',
      mobile: false,
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
          <span className="font-semibold text-fg font-mono tabular-nums text-base md:text-sm">
            {formatStockDisplay(it.stock_actual, { permiteInfinito, corto: true })}
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
      mobile: false,
      cell: (it) =>
        it.stock_minimo > 0
          ? `${formatNumber(it.stock_minimo)}${it.unidad_de_medida !== 'unidad' ? ` ${it.unidad_de_medida}` : ''}`
          : '—',
    },
    {
      id: 'dif',
      header: 'Diferencia',
      align: 'right',
      mobile: false,
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

  const actions = (it: VarianteStockItem) => (
    <div className="flex flex-col items-end gap-1.5">
      {!it.es_bundle && (
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="min-h-9 text-xs px-2"
            onClick={(e) => {
              e.stopPropagation()
              openAccion(it, 'ingreso')
            }}
          >
            Ingresar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-h-9 text-xs px-2"
            onClick={(e) => {
              e.stopPropagation()
              openAccion(it, 'ajuste')
            }}
          >
            Ajustar
          </Button>
        </div>
      )}
      <Link
        href={`/stock/producto/${it.producto_id}`}
        className="text-xs font-medium text-fg-brand hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        Producto →
      </Link>
    </div>
  )

  return (
    <>
      {/* Mobile hero cards */}
      <div className="md:hidden space-y-2">
        {items.map((it) => {
          const label = varianteLabel(it, usarVar1, usarVar2)
          return (
            <div
              key={it.id}
              className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface p-4 shadow-xs"
            >
              <button
                type="button"
                className="w-full text-left cursor-pointer"
                onClick={() => router.push(`/stock/${it.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-fg truncate">{it.producto_nombre}</p>
                    {label && <p className="text-sm text-fg-muted mt-0.5">{label}</p>}
                    <div className="mt-2">
                      <AlertaStockBajo
                        stockActual={it.stock_actual}
                        stockMinimo={it.stock_minimo}
                      />
                    </div>
                  </div>
                  <p className="text-2xl font-bold font-mono tabular-nums text-fg shrink-0 leading-none">
                    {formatStockDisplay(it.stock_actual, { permiteInfinito, corto: true })}
                  </p>
                </div>
              </button>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-3">
                {!it.es_bundle && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="min-h-10"
                      onClick={() => openAccion(it, 'ingreso')}
                    >
                      Ingresar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="min-h-10"
                      onClick={() => openAccion(it, 'ajuste')}
                    >
                      Ajustar
                    </Button>
                  </>
                )}
                <Link
                  href={`/stock/producto/${it.producto_id}`}
                  className="text-xs font-medium text-fg-brand hover:underline ml-auto"
                >
                  Ver producto →
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop table — hide DataTable mobile by wrapping */}
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          rows={items}
          rowKey={(it) => it.id}
          onRowClick={(it) => router.push(`/stock/${it.id}`)}
          rowActions={actions}
        />
      </div>

      {accion && (
        <StockAccionSheet
          key={`${accion.varianteId}-${accion.tab}`}
          open
          onClose={() => setAccion(null)}
          varianteId={accion.varianteId}
          productoNombre={accion.productoNombre}
          varianteLabel={accion.varianteLabel}
          stockActual={accion.stockActual}
          unidadDeMedida={accion.unidadDeMedida}
          esBundle={accion.esBundle}
          initialTab={accion.tab}
        />
      )}
    </>
  )
}
