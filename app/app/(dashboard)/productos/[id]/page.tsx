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
import { formatARS, formatDateTime } from '@/lib/format'
import type { VarianteInput } from '@/app/actions/productos'
import type { KitComponenteState } from '@/components/productos/KitComponentesEditor'
import type { KitComponente } from '@/types/database'
import { obtenerConfiguracionTienda } from '@/lib/configuracion/queries'
import { PageHeader } from '@/components/ui/PageHeader'
import { cn } from '@/components/ui/cn'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditarProductoPage({ params }: PageProps) {
  const { id } = await params
  const [producto, categorias, tallas, colores, historialPrecios, config] = await Promise.all([
    obtenerProducto(id),
    listarCategorias(true),
    listarTallas(true),
    listarColores(true),
    obtenerHistorialPrecios(id),
    obtenerConfiguracionTienda(),
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
      pack_habilitado: (v as unknown as { pack_habilitado: boolean }).pack_habilitado ?? false,
      pack_cantidad: (v as unknown as { pack_cantidad: number | null }).pack_cantidad ?? null,
      pack_precio: (v as unknown as { pack_precio: number | null }).pack_precio ?? null,
      pack_codigo_barras: (v as unknown as { pack_codigo_barras: string | null }).pack_codigo_barras ?? null,
      imagen_url: v.imagen_url ?? null,
    }))

  // Mapear componentes del kit por variante.id → KitComponenteState[]
  const initialKitComponentes: Record<string, KitComponenteState[]> = {}
  if (producto.es_kit) {
    for (const v of producto.variantes.filter((v) => v.activo)) {
      const comps = v.kit_componentes ?? []
      initialKitComponentes[v.id] = comps.map((c: KitComponente) => ({
        componente_variante_id: c.componente_variante_id,
        cantidad: c.cantidad,
        _info: c.componente_variante
          ? {
              id: c.componente_variante.id,
              producto_id: c.componente_variante.producto?.id ?? '',
              producto_nombre: c.componente_variante.producto?.nombre ?? 'Producto',
              talla: c.componente_variante.talla?.nombre ?? null,
              color: c.componente_variante.color?.nombre ?? null,
              color_hex: c.componente_variante.color?.hex_color ?? null,
              codigo_barras: c.componente_variante.codigo_barras ?? null,
              stock_actual: c.componente_variante.stock_actual,
              precio_venta: c.componente_variante.precio_venta ?? 0,
            }
          : undefined,
      }))
    }
  }

  return (
    <div>
      <PageHeader
        title={producto.nombre}
        description="Editar producto y sus variantes"
        actions={
          <div className="flex items-center gap-2">
            <DuplicarProductoButton id={producto.id} />
            <EliminarProductoButton id={producto.id} nombre={producto.nombre} />
          </div>
        }
      />

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
          es_kit: producto.es_kit,
          visible_en_catalogo: producto.visible_en_catalogo,
          recargo_cc_pct: producto.recargo_cc_pct,
        }}
        initialVariantes={initialVariantes}
        categorias={categorias}
        tallas={tallas}
        colores={colores}
        initialEsKit={producto.es_kit}
        initialKitComponentes={initialKitComponentes}
        margenDefault={config?.margen_ganancia_default ?? 0}
        initialTramos={producto.tramos ?? []}
      />

      {historialPrecios.length > 0 && (
        <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden shadow-xs mt-6">
          <div className="px-5 py-3 border-b border-border-subtle">
            <h2 className="text-sm font-semibold text-fg">Historial de precios</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-fg-subtle border-b border-border-subtle">
                  <th className="text-left px-5 py-2.5">Fecha</th>
                  <th className="text-right px-5 py-2.5">Precio anterior</th>
                  <th className="text-right px-5 py-2.5">Precio nuevo</th>
                  <th className="text-right px-5 py-2.5">Variación</th>
                </tr>
              </thead>
              <tbody>
                {historialPrecios.map((h) => {
                  const diff = h.precio_nuevo - h.precio_anterior
                  const pct =
                    h.precio_anterior > 0
                      ? Math.round((diff / h.precio_anterior) * 1000) / 10
                      : null
                  return (
                    <tr key={h.id} className="border-t border-border-subtle">
                      <td className="px-5 py-2.5 text-fg-muted font-mono tabular-nums">
                        {formatDateTime(h.changed_at)}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono tabular-nums text-fg-muted">
                        {formatARS(h.precio_anterior)}
                      </td>
                      <td className="px-5 py-2.5 text-right font-mono tabular-nums font-medium text-fg">
                        {formatARS(h.precio_nuevo)}
                      </td>
                      <td
                        className={cn(
                          'px-5 py-2.5 text-right font-mono tabular-nums font-medium',
                          diff >= 0 ? 'text-success-soft-fg' : 'text-danger-soft-fg'
                        )}
                      >
                        {diff >= 0 ? '+' : ''}
                        {formatARS(diff)}
                        {pct !== null && (
                          <span className="ml-1 text-xs font-normal text-fg-subtle">
                            ({pct >= 0 ? '+' : ''}
                            {pct}%)
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
