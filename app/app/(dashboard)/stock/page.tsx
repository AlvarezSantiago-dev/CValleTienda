import { listarStock } from '@/lib/stock/queries'
import { listarCategorias, listarTallas, listarColores } from '@/lib/productos/queries'
import { TablaStock } from '@/components/stock/TablaStock'
import { FiltrosStock } from '@/components/stock/FiltrosStock'
import { Pagination } from '@/components/ui/Pagination'
import { LinkButton } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'

interface StockPageProps {
  searchParams: Promise<{
    q?: string
    categoria?: string
    talla?: string
    color?: string
    bajo?: string
    page?: string
  }>
}

export default async function StockPage({ searchParams }: StockPageProps) {
  const sp = await searchParams
  const page = Math.max(1, Number(sp.page) || 1)

  const [{ items, total, pageSize }, categorias, tallas, colores] = await Promise.all([
    listarStock({
      search: sp.q,
      categoriaId: sp.categoria || undefined,
      tallaId: sp.talla || undefined,
      colorId: sp.color || undefined,
      soloBajoStock: sp.bajo === '1',
      page,
    }),
    listarCategorias(),
    listarTallas(),
    listarColores(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stock"
        description="Inventario consolidado por variante. Alertas de stock bajo, ingresos y ajustes manuales."
        actions={
          <LinkButton href="/stock/movimientos" variant="secondary" size="sm">
            Ver movimientos
          </LinkButton>
        }
        className="mb-0"
      />

      <FiltrosStock categorias={categorias} tallas={tallas} colores={colores} />

      <TablaStock items={items} />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        basePath="/stock"
        searchParams={{
          q: sp.q,
          categoria: sp.categoria,
          talla: sp.talla,
          color: sp.color,
          bajo: sp.bajo,
        }}
      />
    </div>
  )
}
