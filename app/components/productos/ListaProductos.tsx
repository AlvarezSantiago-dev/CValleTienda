import Link from 'next/link'
import type { ProductoListItem } from '@/lib/productos/queries'
import { EmptyState } from '@/components/ui/EmptyState'

interface ListaProductosProps {
  items: ProductoListItem[]
}

function formatARS(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export function ListaProductos({ items }: ListaProductosProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No hay productos todavía"
        description="Empezá creando tu primer producto. Podés agregar variantes con opciones personalizables y código de barras propio."
        cta={{ label: 'Crear producto', href: '/productos/nuevo' }}
      />
    )
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {items.map((p) => (
          <Link
            key={p.id}
            href={`/productos/${p.id}`}
            className="block bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors"
          >
            <div className="flex items-start gap-3">
              {p.imagen_url ? (
                <img
                  src={p.imagen_url}
                  alt=""
                  className="w-12 h-12 object-cover rounded-lg bg-gray-100 flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-[#0A0A0A]">{p.nombre}</span>
                  <span className={p.stock_total === 0 ? 'text-red-600 font-semibold text-sm' : 'text-[#0A0A0A] font-semibold text-sm'}>
                    {p.stock_total} u.
                  </span>
                </div>
                <div className="text-[13px] text-gray-400 mt-0.5">
                  {p.categoria?.nombre ?? 'Sin categoría'}
                </div>
                {p.codigo_base && (
                  <div className="text-[13px] font-mono text-gray-400">{p.codigo_base}</div>
                )}
                <div className="mt-2 text-sm font-semibold text-lime-700">
                  {formatARS(p.precio_venta)}
                </div>
                {p.pack_info && (
                  <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-lime-700 bg-lime-50 border border-lime-200 rounded-full px-2 py-0.5">
                    📦 Pack ×{p.pack_info.cantidad} — {formatARS(p.pack_info.precio)}
                  </div>
                )}
                {p.es_kit && (
                  <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">
                    🧩 Kit
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">
                <th className="w-14 px-4 py-3"></th>
                <th className="text-left px-4 py-3">Producto</th>
                <th className="text-left px-4 py-3">Categoría</th>
                <th className="text-right px-4 py-3">Precio venta</th>
                <th className="text-right px-4 py-3">Variantes</th>
                <th className="text-right px-4 py-3">Stock total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    {p.imagen_url ? (
                      <img
                        src={p.imagen_url}
                        alt=""
                        className="w-9 h-9 object-cover rounded-lg bg-gray-100"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-gray-100" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/productos/${p.id}`}
                      className="font-medium text-gray-900 hover:text-lime-700"
                    >
                      {p.nombre}
                    </Link>
                    {p.codigo_base && (
                      <div className="text-xs text-gray-500 font-mono">{p.codigo_base}</div>
                    )}
                    {p.pack_info && (
                      <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-lime-700 bg-lime-50 border border-lime-200 rounded-full px-2 py-0.5">
                        📦 Pack ×{p.pack_info.cantidad} — {formatARS(p.pack_info.precio)}
                      </div>
                    )}
                    {p.es_kit && (
                      <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-full px-2 py-0.5">
                        🧩 Kit
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{p.categoria?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatARS(p.precio_venta)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                    {p.variantes_count}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span
                      className={
                        p.stock_total === 0 ? 'text-red-600 font-medium' : 'text-gray-900'
                      }
                    >
                      {p.stock_total}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
