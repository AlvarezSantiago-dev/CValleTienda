import { notFound } from 'next/navigation'
import { aDtoPublico, obtenerTiendaCatalogoPorSlug } from '@/lib/catalogo/queries-publico'
import { CatalogoHeader } from '@/components/catalogo-publico/CatalogoHeader'
import { CatalogoPedidoEnviado } from '@/components/catalogo-publico/CatalogoPedidoEnviado'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PedidoEnviadoPage({ params }: Props) {
  const { slug } = await params
  const tienda = await obtenerTiendaCatalogoPorSlug(slug)
  if (!tienda) notFound()

  return (
    <>
      <CatalogoHeader tienda={aDtoPublico(tienda)} slug={slug} />
      <main className="max-w-lg mx-auto px-4 py-6">
        <CatalogoPedidoEnviado slug={slug} />
      </main>
    </>
  )
}
