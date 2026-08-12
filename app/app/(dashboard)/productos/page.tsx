import { Suspense } from 'react'
import Link from 'next/link'
import { Printer, Plus, Layers, Zap } from 'lucide-react'
import { listarCategorias, listarProductos } from '@/lib/productos/queries'
import { TabsProductos } from '@/components/productos/TabsProductos'
import { Buscador } from '@/components/productos/Buscador'
import { FiltroCategoria } from '@/components/productos/FiltroCategoria'
import { ListaProductos } from '@/components/productos/ListaProductos'
import { Pagination } from '@/components/ui/Pagination'
import { LinkButton } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
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
  const mostrarError = countActivos !== null && countActivos >= limite
  const mostrarWarning =
    countActivos !== null && countActivos >= 250 && countActivos < limite

  return (
    <div>
      <PageHeader
        title="Productos"
        description="Catálogo de tu tienda. Cada producto puede tener variantes con opciones personalizables y código de barras propio."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {ctx?.rubro === 'ropa' && (
              <LinkButton href="/productos/nuevo-conjunto" variant="secondary">
                <Layers size={14} aria-hidden />
                Nuevo conjunto
              </LinkButton>
            )}
            {ctx?.rubro === 'ropa' && (
              <LinkButton href="/productos/carga-express" variant="secondary">
                <Zap size={14} aria-hidden />
                Carga express
              </LinkButton>
            )}
            <a
              href={`/api/productos/pdf${sp.categoria ? `?categoria=${sp.categoria}` : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 h-control-md px-3 text-sm font-medium rounded-[var(--radius-md)] border border-border-default bg-surface text-fg-muted hover:bg-surface-hover transition-colors focus-ring"
            >
              <Printer size={14} aria-hidden />
              Imprimir PDF
            </a>
            <LinkButton href="/productos/nuevo">
              <Plus size={14} aria-hidden />
              Nuevo producto
            </LinkButton>
          </div>
        }
      />

      {mostrarError && (
        <div className="mb-4 rounded-[var(--radius-lg)] bg-danger-soft border border-danger-border px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-danger-soft-fg">
              Límite de {limite} productos alcanzado
            </p>
            <p className="text-xs text-danger-soft-fg mt-0.5 opacity-90">
              No podés agregar más productos en el plan Básico.
            </p>
          </div>
          <Link
            href="/planes"
            className="shrink-0 h-8 px-4 bg-danger hover:bg-danger-hover text-danger-fg text-xs font-semibold rounded-[var(--radius-full)] transition-colors"
          >
            Upgrade a Pro →
          </Link>
        </div>
      )}
      {mostrarWarning && (
        <div className="mb-4 rounded-[var(--radius-lg)] bg-warning-soft border border-warning-border px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-warning-soft-fg">
              Te quedan {limite - countActivos!} productos disponibles en el plan Básico
            </p>
            <p className="text-xs text-warning-soft-fg mt-0.5 opacity-90">
              Al llegar a {limite} no podrás agregar más. Upgrade a Pro para productos ilimitados.
            </p>
          </div>
          <Link
            href="/planes"
            className="shrink-0 h-8 px-4 bg-warning hover:bg-warning text-warning-fg text-xs font-semibold rounded-[var(--radius-full)] transition-colors"
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
