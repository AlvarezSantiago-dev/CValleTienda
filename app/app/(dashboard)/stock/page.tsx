import { listarStock } from '@/lib/stock/queries'
import { listarCategorias, listarTallas, listarColores } from '@/lib/productos/queries'
import { TablaStock } from '@/components/stock/TablaStock'
import { FiltrosStock } from '@/components/stock/FiltrosStock'
import { Pagination } from '@/components/ui/Pagination'
import { LinkButton } from '@/components/ui/Button'

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Stock</h1>
          <p className="text-[13px] text-gray-400 mt-1">
            Inventario consolidado por variante. Alertas de stock bajo, ingresos y
            ajustes manuales.
          </p>
        </div>
        <LinkButton href="/stock/movimientos" variant="secondary" size="sm">
          Ver movimientos
        </LinkButton>
      </div>

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
