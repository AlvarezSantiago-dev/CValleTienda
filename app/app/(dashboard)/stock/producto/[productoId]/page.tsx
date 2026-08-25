import { notFound } from 'next/navigation'
import { obtenerProductoStock, listarMovimientos } from '@/lib/stock/queries'
import { ProductoStockPanel } from '@/components/stock/ProductoStockPanel'
import { LinkButton } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { Breadcrumbs } from '@/components/layout/Breadcrumbs'

interface Props {
  params: Promise<{ productoId: string }>
  searchParams: Promise<{ v?: string }>
}

export default async function StockProductoPage({ params, searchParams }: Props) {
  const { productoId } = await params
  const sp = await searchParams

  const producto = await obtenerProductoStock(productoId)
  if (!producto) notFound()

  const varianteIds = producto.variantes.map((v) => v.id)
  const { items: movimientos } =
    varianteIds.length > 0
      ? await listarMovimientos({ varianteIds, pageSize: 40 })
      : { items: [] }

  return (
    <div className="space-y-6">
      <PageHeader
        title={producto.nombre}
        breadcrumb={<Breadcrumbs />}
        description={
          [
            producto.codigo_base ? `Código ${producto.codigo_base}` : null,
            `${producto.variantes.length} variante${producto.variantes.length === 1 ? '' : 's'}`,
          ]
            .filter(Boolean)
            .join(' · ')
        }
        actions={
          <div className="flex gap-2 flex-wrap">
            <LinkButton href={`/productos/${producto.id}`} variant="secondary" size="sm">
              Editar producto
            </LinkButton>
            <LinkButton href="/stock" variant="ghost" size="sm">
              Volver al listado
            </LinkButton>
          </div>
        }
        className="mb-0"
      />

      <ProductoStockPanel
        producto={producto}
        movimientos={movimientos}
        selectedVarianteId={sp.v ?? null}
      />
    </div>
  )
}
