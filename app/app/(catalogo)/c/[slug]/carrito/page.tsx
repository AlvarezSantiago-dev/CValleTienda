import { notFound } from 'next/navigation'
import { aDtoPublico, obtenerTiendaCatalogoPorSlug } from '@/lib/catalogo/queries-publico'
import { CatalogoHeader } from '@/components/catalogo-publico/CatalogoHeader'
import { CatalogoCarrito } from '@/components/catalogo-publico/CatalogoCarrito'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function CatalogoCarritoPage({ params }: Props) {
  const { slug } = await params
  const tienda = await obtenerTiendaCatalogoPorSlug(slug)
  if (!tienda) notFound()

  return (
    <>
      <CatalogoHeader tienda={aDtoPublico(tienda)} slug={slug} />
      <main className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-lg font-semibold text-fg mb-4">Tu pedido</h1>
        <CatalogoCarrito slug={slug} />
      </main>
    </>
  )
}
