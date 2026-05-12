import { listarCategorias, listarTallas, listarColores } from '@/lib/productos/queries'
import { TabsProductos } from '@/components/productos/TabsProductos'
import { ProductoForm } from '@/components/productos/ProductoForm'

export const dynamic = 'force-dynamic'

export default async function NuevoProductoPage() {
  const [categorias, tallas, colores] = await Promise.all([
    listarCategorias(true),
    listarTallas(true),
    listarColores(true),
  ])

  return (
    <div>
      <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">Nuevo producto</h1>
      <p className="text-[13px] text-gray-400 mb-5">
        Cargá los datos básicos del producto y al menos una variante.
      </p>

      <TabsProductos active="productos" />

      <ProductoForm
        modo="crear"
        categorias={categorias}
        tallas={tallas}
        colores={colores}
      />
    </div>
  )
}
