import { notFound } from 'next/navigation'
import { listarCategorias, listarTallas, listarColores } from '@/lib/productos/queries'
import { getContextoTienda } from '@/lib/supabase/context'
import { TabsProductos } from '@/components/productos/TabsProductos'
import { ConjuntoForm } from '@/components/productos/ConjuntoForm'
import { PageHeader } from '@/components/ui/PageHeader'

export const dynamic = 'force-dynamic'

export default async function NuevoConjuntoPage() {
  const ctx = await getContextoTienda()

  // Solo disponible para tiendas de ropa
  if (!ctx || ctx.rubro !== 'ropa') notFound()

  const [categorias, tallas, colores] = await Promise.all([
    listarCategorias(true),
    listarTallas(true),
    listarColores(true),
  ])

  return (
    <div>
      <PageHeader
        title="Nuevo conjunto"
        description="Creá el kit y sus piezas en un solo paso. El sistema genera automáticamente todos los productos y los vincula."
      />

      <TabsProductos active="productos" />

      <ConjuntoForm categorias={categorias} tallas={tallas} colores={colores} />
    </div>
  )
}
