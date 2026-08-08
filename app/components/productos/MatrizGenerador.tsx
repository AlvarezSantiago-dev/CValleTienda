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
    <div className="border-2 border-primary-border rounded-[var(--radius-lg)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 bg-primary-soft hover:bg-primary-soft text-fg-brand transition-colors"
      >
        <span className="flex items-center gap-2.5 font-bold text-sm">
          <span className="text-xl">&#9889;</span>
          Generar combinaciones desde matriz
        </span>
        <span className="text-fg-brand text-xs font-medium">{expanded ? 'cerrar ▲' : 'abrir ▼'}</span>
      </button>

      {expanded && (
        <div className="p-5 space-y-5 bg-surface">
          <div className={`grid gap-5 ${usarVar2 && colores.length > 0 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {/* Columna Var1 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-primary-soft-fg bg-primary-soft px-2 py-0.5 rounded-md">
                  {labelVar1}
                </span>
                {tallas.length > 1 && (
                  <button
                    type="button"
                    onClick={toggleAllTallas}
                    className="text-xs text-fg-brand hover:underline"
                  >
                    {selTallas.size === tallas.length ? 'Ninguna' : 'Todas'}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {tallas.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTalla(t.id)}
                    className={`text-sm px-3.5 py-1.5 rounded-[var(--radius-md)] border-2 font-medium transition-all ${
                      selTallas.has(t.id)
                        ? 'bg-primary border-primary text-white shadow-sm'
                        : 'border-border-default bg-surface text-fg hover:border-primary hover:text-primary-soft-fg hover:bg-primary-soft'
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
                  <span className="text-[11px] font-bold uppercase tracking-widest text-fg bg-surface-sunken px-2 py-0.5 rounded-md">
                    {labelVar2}
                  </span>
                  {colores.length > 1 && (
                    <button
                      type="button"
                      onClick={toggleAllColores}
                      className="text-xs text-fg-brand hover:underline"
                    >
                      {selColores.size === colores.length ? 'Ninguno' : 'Todos'}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {colores.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleColor(c.id)}
                      className={`text-sm px-3.5 py-1.5 rounded-[var(--radius-md)] border-2 font-medium transition-all inline-flex items-center gap-1.5 ${
                        selColores.has(c.id)
                          ? 'bg-gray-800 border-gray-800 text-white shadow-sm'
                          : 'border-border-default bg-surface text-fg hover:border-gray-400 hover:bg-surface-sunken'
                      }`}
                    >
                      {c.hex_color && (
                        <span
                          className="inline-block w-4 h-4 rounded-full border-2 border-white/60 shrink-0 shadow-sm"
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
          <div className="flex items-center justify-between pt-3 border-t border-primary-border">
            <span className={`text-sm font-medium ${nuevas.length > 0 ? 'text-primary-soft-fg' : 'text-fg-subtle'}`}>{contadorLabel}</span>
            <button
              type="button"
              onClick={handleGenerar}
              disabled={nuevas.length === 0}
              className="text-sm font-semibold bg-primary text-white px-5 py-2 rounded-[var(--radius-lg)] hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              Generar {nuevas.length > 0 ? nuevas.length : ''} variante{nuevas.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
