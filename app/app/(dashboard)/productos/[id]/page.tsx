import { notFound } from 'next/navigation'
import {
  listarCategorias,
  listarTallas,
  listarColores,
  obtenerProducto,
  obtenerHistorialPrecios,
} from '@/lib/productos/queries'
import { TabsProductos } from '@/components/productos/TabsProductos'
import { ProductoForm } from '@/components/productos/ProductoForm'
import { EliminarProductoButton } from '@/components/productos/EliminarProductoButton'
import { DuplicarProductoButton } from '@/components/productos/DuplicarProductoButton'
import { formatARS } from '@/lib/format'
import type { VarianteInput } from '@/app/actions/productos'
import { obtenerComponentesBundleAction } from '@/app/actions/productos'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditarProductoPage({ params }: PageProps) {
  const { id } = await params
  const [producto, categorias, tallas, colores, historialPrecios] = await Promise.all([
    obtenerProducto(id),
    listarCategorias(true),
    listarTallas(true),
    listarColores(true),
    obtenerHistorialPrecios(id),
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

  // Bundle: la primera variante activa es el varianteBundleId
  // Se pasa siempre (no solo cuando ya es bundle) para permitir activarlo
  const esBundleInit = (producto as unknown as Record<string, unknown>).es_bundle === true
  const varianteBundleId = producto.variantes.find((v) => v.activo)?.id ?? undefined
  const componentesInitRes = esBundleInit && varianteBundleId
    ? await obtenerComponentesBundleAction(varianteBundleId)
    : null
  const componentesInit = componentesInitRes?.ok ? (componentesInitRes.data ?? []) : []

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">
            {producto.nombre}
            {esBundleInit && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-lime-100 text-lime-700 align-middle">
                Bundle
              </span>
            )}
          </h1>
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
        esBundleInit={esBundleInit}
        componentesInit={componentesInit}
        varianteBundleId={varianteBundleId}
      />

      {historialPrecios.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)] mt-6">
          <div className="px-5 py-3 border-b border-gray-50">
            <h2 className="text-[13px] font-semibold text-[#0A0A0A]">Historial de precios</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 border-b border-gray-100">
                  <th className="text-left px-5 py-2.5">Fecha</th>
                  <th className="text-right px-5 py-2.5">Precio anterior</th>
                  <th className="text-right px-5 py-2.5">Precio nuevo</th>
                  <th className="text-right px-5 py-2.5">Variación</th>
                </tr>
              </thead>
              <tbody>
                {historialPrecios.map((h) => {
                  const diff = h.precio_nuevo - h.precio_anterior
                  const pct = h.precio_anterior > 0
                    ? Math.round((diff / h.precio_anterior) * 1000) / 10
                    : null
                  return (
                    <tr key={h.id} className="border-t border-gray-50">
                      <td className="px-5 py-2.5 text-gray-500 tabular-nums">
                        {new Date(h.changed_at).toLocaleString('es-AR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums text-gray-500">
                        {formatARS(h.precio_anterior)}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums font-medium text-gray-900">
                        {formatARS(h.precio_nuevo)}
                      </td>
                      <td className={`px-5 py-2.5 text-right tabular-nums font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {diff >= 0 ? '+' : ''}{formatARS(diff)}
                        {pct !== null && (
                          <span className="ml-1 text-xs font-normal text-gray-400">
                            ({pct >= 0 ? '+' : ''}{pct}%)
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
