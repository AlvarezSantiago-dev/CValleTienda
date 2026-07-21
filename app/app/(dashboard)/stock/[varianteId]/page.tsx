import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obtenerVarianteStock, listarMovimientos } from '@/lib/stock/queries'
import { IngresoForm } from '@/components/stock/IngresoForm'
import { AjusteForm } from '@/components/stock/AjusteForm'
import { MovimientosTabla } from '@/components/stock/MovimientosTabla'
import { AlertaStockBajo } from '@/components/stock/AlertaStockBajo'
import { LinkButton } from '@/components/ui/Button'
import { formatARS, formatNumber } from '@/lib/format'
import { esStockInfinito, formatStockDisplay } from '@/lib/stock/infinito'

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/stock"
            className="text-sm text-lime-700 hover:text-lime-800 hover:underline"
          >
            ← Volver a stock
          </Link>
          <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mt-1">
            {variante.producto_nombre}
          </h1>
          <p className="text-[13px] text-gray-400 mt-0.5">
            {[variante.talla, variante.color].filter(Boolean).join(' / ') ||
              'Sin variante'}
            {variante.codigo_barras && (
              <span className="ml-2 font-mono text-xs">
                · {variante.codigo_barras}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton
            href={`/productos/${variante.producto_id}`}
            variant="secondary"
            size="sm"
          >
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
      </div>

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
          value={
            variante.stock_minimo > 0 ? formatNumber(variante.stock_minimo) : '—'
          }
        />
        <Stat
          label="Diferencia"
          value={
            diferencia == null || variante.stock_minimo <= 0
              ? '—'
              : String(diferencia)
          }
          tone={
            diferencia != null && variante.stock_minimo > 0 && diferencia <= 0
              ? 'danger'
              : 'default'
          }
        />
        <Stat
          label="Precio venta"
          value={
            variante.precio_venta != null ? formatARS(variante.precio_venta) : '—'
          }
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {variante.es_bundle ? (
          <div className="md:col-span-2 bg-lime-50 border border-lime-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-lime-800 mb-1">
              Este producto es un bundle / pack
            </p>
            <p className="text-sm text-lime-700">
              El stock se gestiona automáticamente a través de sus componentes.
              No se puede ingresar ni ajustar stock directamente.
              Para modificar componentes, editá el producto.
            </p>
          </div>
        ) : (
          <>
            <IngresoForm varianteId={variante.id} unidadDeMedida={variante.unidad_de_medida} />
            <AjusteForm
              varianteId={variante.id}
              stockActual={variante.stock_actual}
              unidadDeMedida={variante.unidad_de_medida}
            />
          </>
        )}
      </div>

      <div>
        <h2 className="text-[15px] font-semibold text-[#0A0A0A] mb-3">
          Últimos movimientos
        </h2>
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
  const valueCls = tone === 'danger' ? 'text-red-600' : 'text-[#0A0A0A]'
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">{label}</p>
      <p className={`text-[22px] font-bold mt-1 ${valueCls}`}>{value}</p>
      {extra && <div className="mt-2">{extra}</div>}
    </div>
  )
}
