import { notFound } from 'next/navigation'
import { aDtoPublico, obtenerTiendaCatalogoPorSlug } from '@/lib/catalogo/queries-publico'
import { CatalogoHeader } from '@/components/catalogo-publico/CatalogoHeader'
import { CatalogoCheckout } from '@/components/catalogo-publico/CatalogoCheckout'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function CatalogoCheckoutPage({ params }: Props) {
  const { slug } = await params
  const tienda = await obtenerTiendaCatalogoPorSlug(slug)
  if (!tienda) notFound()

  return (
    <>
      <CatalogoHeader tienda={aDtoPublico(tienda)} slug={slug} />
      <main className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-lg font-semibold text-fg mb-4">Datos del pedido</h1>
        <CatalogoCheckout slug={slug} tienda={aDtoPublico(tienda)} />
      </main>
    </>
  )
}
