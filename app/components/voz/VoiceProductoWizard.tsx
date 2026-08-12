'use client'

import { useVoz } from './VoiceProvider'
import { Check, X } from 'lucide-react'

function formatPrecio(n: number): string {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 })
}

export function VoiceProductoWizard() {
  const { paso, draft, cancelar, confirmarProducto } = useVoz()

  if (paso !== 'producto_confirmar') return null

  return (
    <div className="fixed inset-0 z-(--z-modal) flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-surface-overlay" onClick={cancelar} />

      {/* Modal */}
      <div className="relative bg-surface rounded-2xl shadow-overlay w-full max-w-sm overflow-hidden border border-border-default">
        {/* Header */}
        <div className="bg-primary px-5 py-4">
          <h2 className="text-white font-semibold text-lg">Confirmar producto</h2>
          <p className="text-primary-fg text-sm">
            Decí <strong>&ldquo;sí&rdquo;</strong> o tocá Confirmar para guardar
          </p>
        </div>

        {/* Contenido */}
        <div className="px-5 py-4 space-y-3">
          {/* Nombre */}
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Nombre</span>
            <p className="font-semibold text-gray-900 text-base">{draft.nombre ?? '—'}</p>
          </div>

          {/* Código de barras */}
          {draft.codigoBarras !== undefined && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Código de barras</span>
              <p className="text-gray-700 text-sm font-mono">
                {draft.codigoBarras ?? (
                  <span className="text-gray-400 italic">sin código</span>
                )}
              </p>
            </div>
          )}

          {/* Precios */}
          <div className="flex gap-4">
            <div className="flex-1">
              <span className="text-xs text-gray-500 uppercase tracking-wide">Precio venta</span>
              <p className="font-semibold text-gray-900 text-base">
                {draft.precioVenta !== undefined ? formatPrecio(draft.precioVenta) : '—'}
              </p>
            </div>
            {draft.precioCompra !== undefined && draft.precioCompra > 0 && (
              <div className="flex-1">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Precio compra</span>
                <p className="font-semibold text-gray-900 text-base">
                  {formatPrecio(draft.precioCompra)}
                </p>
              </div>
            )}
          </div>

          {/* Unidad de medida */}
          {draft.unidadMedida && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Unidad</span>
              <p className="text-gray-700 text-sm">{draft.unidadMedida}</p>
            </div>
          )}

          {/* Variantes o stock */}
          {draft.tieneVariantes && draft.variantes?.length ? (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Variantes</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {draft.variantes.map((v, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      v.tallaId ? 'bg-primary-soft text-primary-soft-fg' : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {v.label}
                    {v.colorLabel && (
                      <span className="text-[10px] opacity-75">({v.colorLabel})</span>
                    )}
                    <span className="font-bold">×{v.stock}</span>
                    {!v.tallaId && <span title="Talla no encontrada en tu catálogo">⚠</span>}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              <div className="flex-1">
                <span className="text-xs text-gray-500 uppercase tracking-wide">Stock inicial</span>
                <p className="font-semibold text-gray-900">{draft.stockSimple ?? 0} unidades</p>
              </div>
              {draft.stockMinimo !== undefined && draft.stockMinimo > 0 && (
                <div className="flex-1">
                  <span className="text-xs text-gray-500 uppercase tracking-wide">Stock mínimo</span>
                  <p className="font-semibold text-gray-900">{draft.stockMinimo}</p>
                </div>
              )}
            </div>
          )}

          {/* Categoría */}
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Categoría</span>
            <p className="text-gray-700 text-sm">{draft.categoriaNombre ?? 'Sin categoría'}</p>
          </div>

          {/* Descripción */}
          {draft.descripcion && (
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wide">Descripción</span>
              <p className="text-gray-700 text-sm line-clamp-2">{draft.descripcion}</p>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={cancelar}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <X size={16} />
            Cancelar
          </button>
          <button
            onClick={confirmarProducto}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white transition-colors text-sm font-semibold"
          >
            <Check size={16} />
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
