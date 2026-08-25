'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { ProductoStockResumen, VarianteStockItem } from '@/lib/stock/queries'
import { AlertaStockBajo } from './AlertaStockBajo'
import { StockAccionSheet } from './StockAccionSheet'
import { MovimientosTabla } from './MovimientosTabla'
import type { MovimientoStockItem } from '@/lib/stock/queries'
import { useRubro } from '@/components/layout/RubroProvider'
import { rubroPermiteStockInfinito } from '@/lib/rubro/config'
import { formatStockDisplay } from '@/lib/stock/infinito'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'

interface Props {
  producto: ProductoStockResumen
  movimientos: MovimientoStockItem[]
  selectedVarianteId?: string | null
}

function labelOf(v: VarianteStockItem, usarVar1: boolean, usarVar2: boolean) {
  return [usarVar1 ? v.talla : null, usarVar2 ? v.color : null].filter(Boolean).join(' / ') || null
}

export function ProductoStockPanel({
  producto,
  movimientos,
  selectedVarianteId = null,
}: Props) {
  const { usarVar1, usarVar2, labelVar1, labelVar2, rubro } = useRubro()
  const permiteInfinito = rubroPermiteStockInfinito(rubro)

  const initialId =
    selectedVarianteId && producto.variantes.some((v) => v.id === selectedVarianteId)
      ? selectedVarianteId
      : (producto.variantes[0]?.id ?? null)

  const [selectedId, setSelectedId] = useState<string | null>(initialId)
  const [accionTab, setAccionTab] = useState<'ingreso' | 'ajuste' | null>(null)

  const selected = useMemo(
    () => producto.variantes.find((v) => v.id === selectedId) ?? null,
    [producto.variantes, selectedId]
  )

  const esMatriz = usarVar1 && usarVar2 && producto.variantes.length > 1

  return (
    <div className="space-y-6">
      {producto.es_bundle && (
        <div className="bg-primary-soft border border-primary-border rounded-[var(--radius-lg)] p-4">
          <p className="text-sm font-semibold text-primary-soft-fg">Bundle / pack</p>
          <p className="text-sm text-fg-brand mt-1">
            El stock se gestiona por componentes. Editá el producto para cambiar la composición.
          </p>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-[15px] font-semibold text-fg">
          Variantes
          {usarVar1 || usarVar2
            ? ` (${[usarVar1 ? labelVar1 : null, usarVar2 ? labelVar2 : null]
                .filter(Boolean)
                .join(' × ')})`
            : ''}
        </h2>

        <div
          className={cn(
            'grid gap-2',
            esMatriz ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
          )}
        >
          {producto.variantes.map((v) => {
            const label = labelOf(v, usarVar1, usarVar2)
            const active = v.id === selectedId
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedId(v.id)}
                className={cn(
                  'text-left rounded-[var(--radius-lg)] border p-3 transition-colors focus-ring cursor-pointer',
                  active
                    ? 'border-primary bg-primary-soft shadow-xs'
                    : 'border-border-subtle bg-surface hover:border-border-default'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg truncate">
                      {label ?? 'Única'}
                    </p>
                    {v.codigo_barras && (
                      <p className="text-[11px] font-mono text-fg-muted mt-0.5">{v.codigo_barras}</p>
                    )}
                    <div className="mt-1.5">
                      <AlertaStockBajo stockActual={v.stock_actual} stockMinimo={v.stock_minimo} />
                    </div>
                  </div>
                  <p className="text-xl font-bold font-mono tabular-nums text-fg shrink-0">
                    {formatStockDisplay(v.stock_actual, { permiteInfinito, corto: true })}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {selected && !producto.es_bundle && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setAccionTab('ingreso')} className="min-h-11">
            Ingresar
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setAccionTab('ajuste')}
            className="min-h-11"
          >
            Ajustar
          </Button>
          <Link
            href={`/stock/${selected.id}`}
            className="inline-flex items-center text-sm font-medium text-fg-brand hover:underline px-2"
          >
            Detalle de variante →
          </Link>
        </div>
      )}

      <div>
        <h2 className="text-[15px] font-semibold text-fg mb-3">
          Últimos movimientos
          {selected ? (
            <span className="font-normal text-fg-muted text-sm">
              {' '}
              · {labelOf(selected, usarVar1, usarVar2) ?? 'variante'}
            </span>
          ) : null}
        </h2>
        <MovimientosTabla
          items={
            selected
              ? movimientos.filter((m) => m.variante_id === selected.id)
              : movimientos
          }
          mostrarVariante={false}
        />
      </div>

      {selected && accionTab && (
        <StockAccionSheet
          key={`${selected.id}-${accionTab}`}
          open
          onClose={() => setAccionTab(null)}
          varianteId={selected.id}
          productoNombre={producto.nombre}
          varianteLabel={labelOf(selected, usarVar1, usarVar2)}
          stockActual={selected.stock_actual}
          unidadDeMedida={producto.unidad_de_medida}
          esBundle={producto.es_bundle}
          initialTab={accionTab}
        />
      )}
    </div>
  )
}
