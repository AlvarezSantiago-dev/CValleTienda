import { Suspense } from 'react'
import Link from 'next/link'
import { listarCategorias, listarProductos } from '@/lib/productos/queries'
import { TabsProductos } from '@/components/productos/TabsProductos'
import { Buscador } from '@/components/productos/Buscador'
import { FiltroCategoria } from '@/components/productos/FiltroCategoria'
import { ListaProductos } from '@/components/productos/ListaProductos'
import { Pagination } from '@/components/ui/Pagination'
import { LinkButton } from '@/components/ui/Button'
import { getContextoTienda } from '@/lib/supabase/context'
import { createClient } from '@/lib/supabase/server'
import { LIMITES_BASICO } from '@/lib/planes/config'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ q?: string; categoria?: string; page?: string }>
}

export default async function ProductosPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const page = sp.page ? Math.max(1, Number(sp.page)) : 1

  const ctx = await getContextoTienda()

  // Obtener count de productos si es plan Básico (para mostrar warning de límite)
  let countActivos: number | null = null
  if (ctx && ctx.planEfectivo === 'basico') {
    const supabase = await createClient()
    const { count } = await supabase
      .from('productos')
      .select('id', { count: 'exact', head: true })
      .eq('tienda_id', ctx.tiendaId)
      .eq('activo', true)
    countActivos = count ?? 0
  }

  const [{ items, total, pageSize }, categorias] = await Promise.all([
    listarProductos({
      search: sp.q,
      categoriaId: sp.categoria,
      page,
    }),
    listarCategorias(true),
  ])

  const limite = LIMITES_BASICO.max_productos
  const mostrarError   = countActivos !== null && countActivos >= limite
  const mostrarWarning = countActivos !== null && countActivos >= 250 && countActivos < limite

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Productos</h1>
        <div className="flex items-center gap-2">
          {ctx?.rubro === 'ropa' && (
            <LinkButton href="/productos/nuevo-conjunto" variant="secondary">
              🧩 Nuevo conjunto
            </LinkButton>
          )}
          <a
            href={`/api/productos/pdf${sp.categoria ? `?categoria=${sp.categoria}` : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-3 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimir PDF
          </a>
          <LinkButton href="/productos/nuevo">+ Nuevo producto</LinkButton>
        </div>
      </div>
      <p className="text-[13px] text-gray-400 mb-5">
        Catálogo de tu tienda. Cada producto puede tener variantes con opciones personalizables y
        código de barras propio.
      </p>

      {/* Banner límite de productos — solo plan Básico */}
      {mostrarError && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-red-800">Límite de {limite} productos alcanzado</p>
            <p className="text-xs text-red-700 mt-0.5">No podés agregar más productos en el plan Básico.</p>
          </div>
          <Link
            href="/planes"
            className="shrink-0 h-8 px-4 bg-red-800 hover:bg-red-900 text-white text-xs font-semibold rounded-full transition-colors"
          >
            Upgrade a Pro →
          </Link>
        </div>
      )}
      {mostrarWarning && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-800">
              Te quedan {limite - countActivos!} productos disponibles en el plan Básico
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Al llegar a {limite} no podrás agregar más. Upgrade a Pro para productos ilimitados.
            </p>
          </div>
          <Link
            href="/planes"
            className="shrink-0 h-8 px-4 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold rounded-full transition-colors"
          >
            Ver planes →
          </Link>
        </div>
      )}

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
