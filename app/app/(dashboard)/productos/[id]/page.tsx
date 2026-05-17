import { notFound } from 'next/navigation'
import {
  listarCategorias,
  listarTallas,
  listarColores,
  obtenerProducto,
} from '@/lib/productos/queries'
import { TabsProductos } from '@/components/productos/TabsProductos'
import { ProductoForm } from '@/components/productos/ProductoForm'
import { EliminarProductoButton } from '@/components/productos/EliminarProductoButton'
import { DuplicarProductoButton } from '@/components/productos/DuplicarProductoButton'
import type { VarianteInput } from '@/app/actions/productos'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditarProductoPage({ params }: PageProps) {
  const { id } = await params
  const [producto, categorias, tallas, colores] = await Promise.all([
    obtenerProducto(id),
    listarCategorias(true),
    listarTallas(true),
    listarColores(true),
  ])

  if (!producto || !producto.activo) notFound()

  const initialVariantes: VarianteInput[] = producto.variantes
    .filter((v) => v.activo)
    .map((v) => ({
      id: v.id,
      talla_id: v.talla_id,
      color_id: v.color_id,
      codigo_barras: v.codigo_barras,
      precio_venta: v.precio_venta,
      stock_inicial: v.stock_actual,
      stock_minimo: v.stock_minimo,
    }))

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">{producto.nombre}</h1>
          <p className="text-[13px] text-gray-400">Editar producto y sus variantes</p>
        </div>
        <div className="flex items-center gap-2">
          <DuplicarProductoButton id={producto.id} />
          <EliminarProductoButton id={producto.id} nombre={producto.nombre} />
        </div>
      </div>

      <TabsProductos active="productos" />

      <ProductoForm
        modo="editar"
        productoId={producto.id}
        initial={{
          nombre: producto.nombre,
          descripcion: producto.descripcion,
          codigo_base: producto.codigo_base,
          categoria_id: producto.categoria_id,
          precio_compra: producto.precio_compra,
          precio_venta: producto.precio_venta,
          unidad_de_medida: producto.unidad_de_medida,
          imagen_url: producto.imagen_url,
        }}
        initialVariantes={initialVariantes}
        categorias={categorias}
        tallas={tallas}
        colores={colores}
      />
    </div>
  )
}
