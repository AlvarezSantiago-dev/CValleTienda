import { notFound } from 'next/navigation'
import { obtenerVarianteStock, listarMovimientos } from '@/lib/stock/queries'
import { StockVarianteTabs } from '@/components/stock/StockVarianteTabs'
import { AlertaStockBajo } from '@/components/stock/AlertaStockBajo'
import { LinkButton } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'
import { formatARS, formatNumber, formatSignedDelta } from '@/lib/format'
import { esStockInfinito, formatStockDisplay } from '@/lib/stock/infinito'
import { rubroPermiteStockInfinito } from '@/lib/rubro/config'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/components/ui/cn'
import type { Rubro } from '@/types/database'

interface DetalleProps {
  params: Promise<{ varianteId: string }>
}

async function getPermiteInfinito(): Promise<boolean> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return false
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id')
    .eq('id', auth.user.id)
    .maybeSingle()
  const tiendaId = (perfil as { tienda_id?: string } | null)?.tienda_id
  if (!tiendaId) return false
  const { data: tienda } = await supabase
    .from('tiendas')
    .select('rubro')
    .eq('id', tiendaId)
    .maybeSingle()
  return rubroPermiteStockInfinito((tienda as { rubro?: Rubro } | null)?.rubro)
}

export default async function StockVariantePage({ params }: DetalleProps) {
  const { varianteId } = await params

  const [variante, permiteInfinito] = await Promise.all([
    obtenerVarianteStock(varianteId),
    getPermiteInfinito(),
  ])
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
            <LinkButton
              href={`/stock/producto/${variante.producto_id}?v=${variante.id}`}
              variant="secondary"
              size="sm"
            >
              Stock del producto
            </LinkButton>
            <LinkButton href={`/productos/${variante.producto_id}`} variant="ghost" size="sm">
              Editar producto
            </LinkButton>
          </div>
        }
        className="mb-0"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label="Stock actual"
          value={formatStockDisplay(variante.stock_actual, { permiteInfinito })}
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
            diferencia == null || variante.stock_minimo <= 0
              ? '—'
              : formatSignedDelta(diferencia)
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

      <StockVarianteTabs
        varianteId={variante.id}
        stockActual={variante.stock_actual}
        unidadDeMedida={variante.unidad_de_medida}
        esBundle={variante.es_bundle}
        productoId={variante.producto_id}
        movimientos={movimientos}
      />
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
