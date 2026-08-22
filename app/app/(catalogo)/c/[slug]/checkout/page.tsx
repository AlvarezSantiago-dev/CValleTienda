import { notFound } from 'next/navigation'
import { aDtoPublico, obtenerTiendaCatalogoPorSlug } from '@/lib/catalogo/queries-publico'
import { CatalogoShell } from '@/components/catalogo-publico/CatalogoShell'
import { CatalogoCheckout } from '@/components/catalogo-publico/CatalogoCheckout'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function CatalogoCheckoutPage({ params }: Props) {
  const { slug } = await params
  const tienda = await obtenerTiendaCatalogoPorSlug(slug)
  if (!tienda) notFound()

  return (
    <CatalogoShell
      tienda={aDtoPublico(tienda)}
      slug={slug}
      narrow
      showBack
      backHref={`/c/${slug}/carrito`}
      reserveBar={false}
      title="Datos del pedido"
    >
      <CatalogoCheckout slug={slug} tienda={aDtoPublico(tienda)} />
    </CatalogoShell>
  )
}
