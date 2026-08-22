import { notFound } from 'next/navigation'
import { aDtoPublico, obtenerTiendaCatalogoPorSlug } from '@/lib/catalogo/queries-publico'
import { CatalogoShell } from '@/components/catalogo-publico/CatalogoShell'
import { CatalogoCarrito } from '@/components/catalogo-publico/CatalogoCarrito'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function CatalogoCarritoPage({ params }: Props) {
  const { slug } = await params
  const tienda = await obtenerTiendaCatalogoPorSlug(slug)
  if (!tienda) notFound()

  return (
    <CatalogoShell
      tienda={aDtoPublico(tienda)}
      slug={slug}
      narrow
      showBack
      reserveBar={false}
      title="Tu pedido"
    >
      <CatalogoCarrito slug={slug} />
    </CatalogoShell>
  )
}
