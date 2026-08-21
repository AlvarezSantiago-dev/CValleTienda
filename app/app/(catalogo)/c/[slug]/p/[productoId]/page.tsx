import { notFound } from 'next/navigation'
import {
  aDtoPublico,
  obtenerProductoCatalogo,
  obtenerRubroTiendaId,
  obtenerTiendaCatalogoPorSlug,
} from '@/lib/catalogo/queries-publico'
import { CatalogoHeader } from '@/components/catalogo-publico/CatalogoHeader'
import { CatalogoFicha } from '@/components/catalogo-publico/CatalogoFicha'
import { rubroPermiteStockInfinito } from '@/lib/rubro/config'
import type { Rubro } from '@/lib/rubro/config'

interface Props {
  params: Promise<{ slug: string; productoId: string }>
}

export default async function CatalogoProductoPage({ params }: Props) {
  const { slug, productoId } = await params
  const tienda = await obtenerTiendaCatalogoPorSlug(slug)
  if (!tienda) notFound()
  const rubro = (await obtenerRubroTiendaId(tienda.id)) as Rubro | null
  const producto = await obtenerProductoCatalogo(
    tienda.id,
    productoId,
    rubroPermiteStockInfinito(rubro)
  )
  if (!producto) notFound()

  return (
    <>
      <CatalogoHeader tienda={aDtoPublico(tienda)} slug={slug} />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <CatalogoFicha slug={slug} producto={producto} />
      </main>
    </>
  )
}
