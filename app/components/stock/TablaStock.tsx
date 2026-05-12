'use client'

import Link from 'next/link'
import type { VarianteStockItem } from '@/lib/stock/queries'
import { formatARS, formatNumber, formatSignedDelta } from '@/lib/format'
import { AlertaStockBajo } from './AlertaStockBajo'
import { useRubro } from '@/components/layout/RubroProvider'

interface TablaStockProps {
  items: VarianteStockItem[]
}

export function TablaStock({ items }: TablaStockProps) {
  const { labelVar1, labelVar2, usarVar1, usarVar2 } = useRubro()
  if (items.length === 0) {
    return (
      <div className="bg-white border border-dashed border-gray-200 rounded-xl p-10 text-center text-sm text-gray-500">
        Sin variantes que coincidan con los filtros aplicados.
      </div>
    )
  }

  return (
    <>
      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {items.map((it) => {
          const diferencia = it.stock_actual - it.stock_minimo
          return (
            <div key={it.id} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="font-semibold text-[#0A0A0A] text-sm">{it.producto_nombre}</span>
                <AlertaStockBajo stockActual={it.stock_actual} stockMinimo={it.stock_minimo} />
              </div>
              {(usarVar1 || usarVar2) && (
                <div className="text-[13px] text-gray-400 mb-1 flex items-center gap-1.5">
                  {usarVar2 && it.color_hex && (
                    <span
                      className="h-3 w-3 rounded-full border border-gray-200 inline-block"
                      style={{ backgroundColor: it.color_hex }}
                    />
                  )}
                  {[usarVar1 ? it.talla : null, usarVar2 ? it.color : null].filter(Boolean).join(' / ') || '—'}
                </div>
              )}
              {it.codigo_barras && (
                <div className="font-mono text-xs text-gray-400 mb-2">{it.codigo_barras}</div>
              )}
              <div className="flex items-center justify-between mt-2">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.08em] text-gray-400 mr-1">Stock</span>
                  <span className="font-bold text-[#0A0A0A]">{formatNumber(it.stock_actual)}</span>
                  {it.stock_minimo > 0 && (
                    <span className="text-[13px] text-gray-400 ml-2">/ mín {formatNumber(it.stock_minimo)}</span>
                  )}
                  {it.stock_minimo > 0 && (
                    <span className={`ml-2 text-xs font-medium ${it.stock_minimo > 0 && diferencia <= 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      ({diferencia >= 0 ? '+' : ''}{diferencia})
                    </span>
                  )}
                </div>
                <Link href={`/stock/${it.id}`} className="text-xs text-lime-700 hover:underline font-medium">
                  Ajustar →
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">
                <th className="px-3 py-2 text-left">Producto</th>
                {(usarVar1 || usarVar2) && (
                  <th className="px-3 py-2 text-left">
                    {usarVar1 && usarVar2
                      ? `${labelVar1} / ${labelVar2}`
                      : usarVar1
                        ? labelVar1
                        : labelVar2}
                  </th>
                )}
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-right">Precio</th>
                <th className="px-3 py-2 text-right">Stock</th>
                <th className="px-3 py-2 text-right">Mínimo</th>
                <th className="px-3 py-2 text-right">Diferencia</th>
                <th className="px-3 py-2 text-right" />
              </tr>
            </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((it) => {
              const diferencia = it.stock_actual - it.stock_minimo
              const diferenciaCls =
                it.stock_minimo > 0 && diferencia <= 0
                  ? 'text-red-600 font-medium'
                  : 'text-gray-600'
              return (
                <tr key={it.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{it.producto_nombre}</div>
                    {it.codigo_base && (
                      <div className="text-xs text-gray-500">{it.codigo_base}</div>
                    )}
                  </td>
                  {(usarVar1 || usarVar2) && (
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 text-gray-700">
                        {usarVar2 && it.color_hex && (
                          <span
                            className="h-3 w-3 rounded-full border border-gray-200"
                            style={{ backgroundColor: it.color_hex }}
                          />
                        )}
                        <span>
                          {[usarVar1 ? it.talla : null, usarVar2 ? it.color : null]
                            .filter(Boolean)
                            .join(' / ') || '—'}
                        </span>
                      </div>
                    </td>
                  )}
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">
                    {it.codigo_barras ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700">
                    {it.precio_venta != null ? formatARS(it.precio_venta) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <AlertaStockBajo
                        stockActual={it.stock_actual}
                        stockMinimo={it.stock_minimo}
                      />
                      <span className="font-semibold text-gray-900">
                        {formatNumber(it.stock_actual)}
                        {it.unidad_de_medida !== 'unidad' && (
                          <span className="ml-1 text-xs font-normal text-gray-500">{it.unidad_de_medida}</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {it.stock_minimo > 0
                      ? `${formatNumber(it.stock_minimo)}${it.unidad_de_medida !== 'unidad' ? ` ${it.unidad_de_medida}` : ''}`
                      : '—'}
                  </td>
                  <td className={`px-3 py-2 text-right ${diferenciaCls}`}>
                    {it.stock_minimo > 0 ? formatSignedDelta(diferencia) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/stock/${it.id}`}
                      className="text-lime-700 hover:underline text-xs font-medium"
                    >
                      Ajustar →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>
    </>
  )
}
