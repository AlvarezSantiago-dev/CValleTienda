'use client'

import { useState } from 'react'
import Link from 'next/link'
import { IngresoForm } from '@/components/stock/IngresoForm'
import { AjusteForm } from '@/components/stock/AjusteForm'
import { MovimientosTabla } from '@/components/stock/MovimientosTabla'
import type { MovimientoStockItem } from '@/lib/stock/queries'
import { ControlledTabs } from '@/components/ui/Tabs'

interface Props {
  varianteId: string
  stockActual: number
  unidadDeMedida: string
  esBundle: boolean
  productoId: string
  movimientos: MovimientoStockItem[]
}

export function StockVarianteTabs({
  varianteId,
  stockActual,
  unidadDeMedida,
  esBundle,
  productoId,
  movimientos,
}: Props) {
  const [tab, setTab] = useState<'ingreso' | 'ajuste' | 'movimientos'>('ingreso')

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--radius-lg)] border border-primary-border bg-primary-soft px-4 py-3">
        <Link
          href={`/stock/producto/${productoId}?v=${varianteId}`}
          className="text-sm font-medium text-fg-brand hover:underline"
        >
          Ver todas las variantes del producto →
        </Link>
      </div>

      {esBundle ? (
        <div className="bg-primary-soft border border-primary-border rounded-[var(--radius-lg)] p-5">
          <p className="text-sm font-semibold text-primary-soft-fg mb-1">
            Este producto es un bundle / pack
          </p>
          <p className="text-sm text-fg-brand">
            El stock se gestiona automáticamente a través de sus componentes. No se puede ingresar ni
            ajustar stock directamente. Para modificar componentes, editá el producto.
          </p>
        </div>
      ) : (
        <>
          <ControlledTabs
            value={tab}
            onChange={(v) => setTab(v as typeof tab)}
            items={[
              { value: 'ingreso', label: 'Ingreso' },
              { value: 'ajuste', label: 'Ajuste' },
              { value: 'movimientos', label: 'Movimientos' },
            ]}
            variant="pill"
            className="w-full sm:w-auto"
          />

          {tab === 'ingreso' && (
            <IngresoForm
              varianteId={varianteId}
              unidadDeMedida={unidadDeMedida}
              autoFocus
            />
          )}
          {tab === 'ajuste' && (
            <AjusteForm
              varianteId={varianteId}
              stockActual={stockActual}
              unidadDeMedida={unidadDeMedida}
              autoFocus
            />
          )}
          {tab === 'movimientos' && (
            <MovimientosTabla items={movimientos} mostrarVariante={false} />
          )}
        </>
      )}

      {esBundle && (
        <div>
          <h2 className="text-[15px] font-semibold text-fg mb-3">Últimos movimientos</h2>
          <MovimientosTabla items={movimientos} mostrarVariante={false} />
        </div>
      )}
    </div>
  )
}
