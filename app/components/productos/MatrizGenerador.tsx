'use client'

import { useState } from 'react'
import type { Talla, Color } from '@/types/database'
import type { VarianteInput } from '@/app/actions/productos'

interface MatrizGeneradorProps {
  tallas: Talla[]
  colores: Color[]
  labelVar1: string
  labelVar2: string
  usarVar2: boolean
  variantesActuales: VarianteInput[]
  onGenerar: (nuevas: VarianteInput[]) => void
}

export function MatrizGenerador({
  tallas,
  colores,
  labelVar1,
  labelVar2,
  usarVar2,
  variantesActuales,
  onGenerar,
}: MatrizGeneradorProps) {
  const [expanded, setExpanded] = useState(false)
  const [selTallas, setSelTallas] = useState<Set<string>>(new Set())
  const [selColores, setSelColores] = useState<Set<string>>(new Set())

  const existingKeys = new Set(
    variantesActuales
      .filter((v) => !v.eliminar)
      .map((v) => `${v.talla_id ?? ''}_${v.color_id ?? ''}`)
  )

  const tallasArr = Array.from(selTallas)
  const coloresArr = Array.from(selColores)
  const combos: { tallaId: string; colorId: string | null }[] = usarVar2
    ? tallasArr.flatMap((t) => coloresArr.map((c) => ({ tallaId: t, colorId: c })))
    : tallasArr.map((t) => ({ tallaId: t, colorId: null }))

  const nuevas = combos.filter(
    (c) => !existingKeys.has(`${c.tallaId}_${c.colorId ?? ''}`)
  )

  function toggleTalla(id: string) {
    setSelTallas((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleColor(id: string) {
    setSelColores((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAllTallas() {
    setSelTallas(
      selTallas.size === tallas.length ? new Set() : new Set(tallas.map((t) => t.id))
    )
  }

  function toggleAllColores() {
    setSelColores(
      selColores.size === colores.length ? new Set() : new Set(colores.map((c) => c.id))
    )
  }

  function handleGenerar() {
    const variantesNuevas: VarianteInput[] = nuevas.map((c) => ({
      talla_id: c.tallaId,
      color_id: c.colorId,
      codigo_barras: null,
      precio_venta: null,
      stock_inicial: 0,
      stock_minimo: 0,
    }))
    onGenerar(variantesNuevas)
    setSelTallas(new Set())
    setSelColores(new Set())
    setExpanded(false)
  }

  // No mostrar si no hay opciones en var1
  if (tallas.length === 0) return null

  const contadorLabel =
    nuevas.length > 0
      ? `${nuevas.length} variante${nuevas.length !== 1 ? 's' : ''} nueva${nuevas.length !== 1 ? 's' : ''} a agregar`
      : combos.length > 0
        ? 'Esas combinaciones ya existen'
        : 'Seleccioná opciones para generar'

  return (
    <div className="border border-dashed border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
      >
        <span>⚡ Generar desde matriz</span>
        <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="p-4 space-y-4 bg-white">
          <div className={`grid gap-4 ${usarVar2 && colores.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {/* Columna Var1 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {labelVar1}
                </span>
                {tallas.length > 1 && (
                  <button
                    type="button"
                    onClick={toggleAllTallas}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    {selTallas.size === tallas.length ? 'Ninguna' : 'Todas'}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tallas.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTalla(t.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      selTallas.has(t.id)
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-gray-300 text-gray-600 hover:border-indigo-400'
                    }`}
                  >
                    {t.nombre}
                  </button>
                ))}
              </div>
            </div>

            {/* Columna Var2 */}
            {usarVar2 && colores.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {labelVar2}
                  </span>
                  {colores.length > 1 && (
                    <button
                      type="button"
                      onClick={toggleAllColores}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      {selColores.size === colores.length ? 'Ninguno' : 'Todos'}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {colores.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleColor(c.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors inline-flex items-center gap-1.5 ${
                        selColores.has(c.id)
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-300 text-gray-600 hover:border-indigo-400'
                      }`}
                    >
                      {c.hex_color && (
                        <span
                          className="inline-block w-3 h-3 rounded-full border border-white/50 shrink-0"
                          style={{ backgroundColor: c.hex_color }}
                        />
                      )}
                      {c.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer con counter y botón generar */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <span className="text-xs text-gray-500">{contadorLabel}</span>
            <button
              type="button"
              onClick={handleGenerar}
              disabled={nuevas.length === 0}
              className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Generar {nuevas.length > 0 ? nuevas.length : ''} variante{nuevas.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
