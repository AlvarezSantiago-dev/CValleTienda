import { notFound } from 'next/navigation'
import { listarCategorias, listarTallas, listarColores } from '@/lib/productos/queries'
import { getContextoTienda } from '@/lib/supabase/context'
import { TabsProductos } from '@/components/productos/TabsProductos'
import { ConjuntoForm } from '@/components/productos/ConjuntoForm'

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
      <div className="mb-1">
        <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Nuevo conjunto</h1>
        <p className="text-[13px] text-gray-400">
          Creá el kit y sus piezas en un solo paso. El sistema genera automáticamente todos los productos y los vincula.
        </p>
      </div>

      <TabsProductos active="productos" />

      <ConjuntoForm categorias={categorias} tallas={tallas} colores={colores} />
    </div>
  )
}
