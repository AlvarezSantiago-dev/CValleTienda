import { notFound } from 'next/navigation'
import {
  aDtoPublico,
  catalogoTieneSinCategoria,
  listarCategoriasCatalogoPublico,
  listarDestacadosCatalogo,
  listarProductosCatalogo,
  obtenerTiendaCatalogoPorSlug,
} from '@/lib/catalogo/queries-publico'
import { CatalogoShell } from '@/components/catalogo-publico/CatalogoShell'
import { CatalogoGrilla } from '@/components/catalogo-publico/CatalogoGrilla'
import { CatalogoDestacados } from '@/components/catalogo-publico/CatalogoDestacados'
import { rubroPermiteStockInfinito } from '@/lib/rubro/config'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{
    page?: string
    q?: string
    categoria?: string
  }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const tienda = await obtenerTiendaCatalogoPorSlug(slug)
  if (!tienda) return { title: 'Catálogo', robots: { index: false, follow: false } }
  return {
    title: tienda.nombre,
    description: tienda.catalogo_mensaje_bienvenida || `Pedí por WhatsApp en ${tienda.nombre}`,
    robots: { index: false, follow: false },
    openGraph: {
      title: tienda.nombre,
      images: tienda.logo_url ? [tienda.logo_url] : undefined,
    },
  }
}

export default async function CatalogoPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  const tienda = await obtenerTiendaCatalogoPorSlug(slug)
  if (!tienda) notFound()

  const page = Math.max(1, Number(sp.page) || 1)
  const q = sp.q?.trim() ?? ''
  const categoria = sp.categoria?.trim() || null

  const rubro = tienda.rubro
  const permiteInfinito = rubroPermiteStockInfinito(rubro)

  const [destacados, listado, categorias, haySinCategoria] = await Promise.all([
    listarDestacadosCatalogo(tienda.id, permiteInfinito),
    listarProductosCatalogo(tienda.id, permiteInfinito, {
      page,
      categoriaId: categoria,
      search: q || null,
    }),
    listarCategoriasCatalogoPublico(tienda.id),
    catalogoTieneSinCategoria(tienda.id),
  ])

  const pub = aDtoPublico(tienda)

  return (
    <CatalogoShell tienda={pub} slug={slug}>
      {pub.catalogo_mensaje_bienvenida && (
        <p className="text-sm text-fg-muted mb-4">{pub.catalogo_mensaje_bienvenida}</p>
      )}

      <CatalogoDestacados slug={slug} productos={destacados} />

      <div className="mb-3">
        <h2 className="text-lg font-semibold text-fg">Todos los productos</h2>
        <p className="text-sm text-fg-muted">Buscá o filtrá por categoría</p>
      </div>

      <CatalogoGrilla
        slug={slug}
        productos={listado.items}
        categorias={categorias}
        haySinCategoria={haySinCategoria}
        total={listado.total}
        page={listado.page}
        pageSize={listado.pageSize}
        initialQ={q}
        initialCategoria={categoria}
      />
    </CatalogoShell>
  )
}
