import { Suspense } from 'react'
import { listarCategorias, listarProductos } from '@/lib/productos/queries'
import { TabsProductos } from '@/components/productos/TabsProductos'
import { Buscador } from '@/components/productos/Buscador'
import { FiltroCategoria } from '@/components/productos/FiltroCategoria'
import { ListaProductos } from '@/components/productos/ListaProductos'
import { Pagination } from '@/components/ui/Pagination'
import { LinkButton } from '@/components/ui/Button'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ q?: string; categoria?: string; page?: string }>
}

export default async function ProductosPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const page = sp.page ? Math.max(1, Number(sp.page)) : 1

  const [{ items, total, pageSize }, categorias] = await Promise.all([
    listarProductos({
      search: sp.q,
      categoriaId: sp.categoria,
      page,
    }),
    listarCategorias(true),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Productos</h1>
        <LinkButton href="/productos/nuevo">+ Nuevo producto</LinkButton>
      </div>
      <p className="text-[13px] text-gray-400 mb-5">
        Cat\u00e1logo de tu tienda. Cada producto puede tener variantes con opciones personalizables y
        c\u00f3digo de barras propio.
      </p>

      <TabsProductos active="productos" />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-3 mb-4">
        <Suspense fallback={null}>
          <Buscador />
        </Suspense>
        <Suspense fallback={null}>
          <FiltroCategoria categorias={categorias} />
        </Suspense>
      </div>

      <ListaProductos items={items} />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        basePath="/productos"
        searchParams={{ q: sp.q, categoria: sp.categoria }}
      />
    </div>
  )
}
