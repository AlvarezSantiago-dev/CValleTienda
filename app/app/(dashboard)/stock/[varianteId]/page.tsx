import { notFound } from 'next/navigation'
import { obtenerVarianteStock, listarMovimientos } from '@/lib/stock/queries'
import { IngresoForm } from '@/components/stock/IngresoForm'
import { AjusteForm } from '@/components/stock/AjusteForm'
import { MovimientosTabla } from '@/components/stock/MovimientosTabla'
import { AlertaStockBajo } from '@/components/stock/AlertaStockBajo'
import { LinkButton } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { formatARS, formatNumber } from '@/lib/format'
import { esStockInfinito, formatStockDisplay } from '@/lib/stock/infinito'
import { cn } from '@/components/ui/cn'

interface DetalleProps {
  params: Promise<{ varianteId: string }>
}

export default async function StockVariantePage({ params }: DetalleProps) {
  const { varianteId } = await params

  const variante = await obtenerVarianteStock(varianteId)
  if (!variante) notFound()

  const { items: movimientos } = await listarMovimientos({
    varianteId,
    pageSize: 20,
  })

  const diferencia = esStockInfinito(variante.stock_actual)
    ? null
    : variante.stock_actual - variante.stock_minimo

  return (
    <div className="space-y-6">
      <PageHeader
        title={variante.producto_nombre}
        breadcrumb={<Breadcrumbs />}
        description={
          [
            [variante.talla, variante.color].filter(Boolean).join(' / ') || 'Sin variante',
            variante.codigo_barras ? variante.codigo_barras : null,
          ]
            .filter(Boolean)
            .join(' · ')
        }
        actions={
          <div className="flex gap-2 flex-wrap">
            <LinkButton href={`/productos/${variante.producto_id}`} variant="secondary" size="sm">
              Ver producto
            </LinkButton>
            <LinkButton
              href={`/stock/movimientos?varianteId=${variante.id}`}
              variant="ghost"
              size="sm"
            >
              Historial completo
            </LinkButton>
          </div>
        }
        className="mb-0"
      />

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Stat
          label="Stock actual"
          value={formatStockDisplay(variante.stock_actual)}
          extra={
            <AlertaStockBajo
              stockActual={variante.stock_actual}
              stockMinimo={variante.stock_minimo}
            />
          }
        />
        <Stat
          label="Stock mínimo"
          value={variante.stock_minimo > 0 ? formatNumber(variante.stock_minimo) : '—'}
        />
        <Stat
          label="Diferencia"
          value={
            diferencia == null || variante.stock_minimo <= 0 ? '—' : String(diferencia)
          }
          tone={
            diferencia != null && variante.stock_minimo > 0 && diferencia <= 0
              ? 'danger'
              : 'default'
          }
        />
        <Stat
          label="Precio venta"
          value={variante.precio_venta != null ? formatARS(variante.precio_venta) : '—'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {variante.es_bundle ? (
          <div className="md:col-span-2 bg-primary-soft border border-primary-border rounded-[var(--radius-lg)] p-5">
            <p className="text-sm font-semibold text-primary-soft-fg mb-1">
              Este producto es un bundle / pack
            </p>
            <p className="text-sm text-fg-brand">
              El stock se gestiona automáticamente a través de sus componentes. No se puede ingresar
              ni ajustar stock directamente. Para modificar componentes, editá el producto.
            </p>
          </div>
        ) : (
          <>
            <IngresoForm
              varianteId={variante.id}
              unidadDeMedida={variante.unidad_de_medida}
            />
            <AjusteForm
              varianteId={variante.id}
              stockActual={variante.stock_actual}
              unidadDeMedida={variante.unidad_de_medida}
            />
          </>
        )}
      </div>

      <div>
        <h2 className="text-[15px] font-semibold text-fg mb-3">Últimos movimientos</h2>
        <MovimientosTabla items={movimientos} mostrarVariante={false} />
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  tone = 'default',
  extra,
}: {
  label: string
  value: string
  tone?: 'default' | 'danger'
  extra?: React.ReactNode
}) {
  return (
    <div className="bg-surface rounded-[var(--radius-lg)] border border-border-subtle p-4 shadow-xs">
      <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-fg-subtle">{label}</p>
      <p
        className={cn(
          'text-[22px] font-bold mt-1 font-mono tabular-nums',
          tone === 'danger' ? 'text-danger-soft-fg' : 'text-fg'
        )}
      >
        {value}
      </p>
      {extra && <div className="mt-2">{extra}</div>}
    </div>
  )
}
