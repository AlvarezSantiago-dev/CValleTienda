import { notFound } from 'next/navigation'
import {
  aDtoPublico,
  listarProductosCatalogo,
  obtenerRubroTiendaId,
  obtenerTiendaCatalogoPorSlug,
} from '@/lib/catalogo/queries-publico'
import { CatalogoHeader } from '@/components/catalogo-publico/CatalogoHeader'
import { CatalogoGrilla } from '@/components/catalogo-publico/CatalogoGrilla'
import { rubroPermiteStockInfinito } from '@/lib/rubro/config'
import type { Rubro } from '@/lib/rubro/config'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
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

export default async function CatalogoPage({ params }: Props) {
  const { slug } = await params
  const tienda = await obtenerTiendaCatalogoPorSlug(slug)
  if (!tienda) notFound()
  const rubro = (await obtenerRubroTiendaId(tienda.id)) as Rubro | null
  const productos = await listarProductosCatalogo(tienda.id, rubroPermiteStockInfinito(rubro))
  const pub = aDtoPublico(tienda)

  return (
    <>
      <CatalogoHeader tienda={pub} slug={slug} />
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {pub.catalogo_mensaje_bienvenida && (
          <p className="text-sm text-fg-muted">{pub.catalogo_mensaje_bienvenida}</p>
        )}
        <CatalogoGrilla slug={slug} productos={productos} />
      </main>
    </>
  )
}
