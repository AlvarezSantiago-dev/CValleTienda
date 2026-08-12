'use client'

import { X, Check, Barcode } from 'lucide-react'
import { useVoz } from './VoiceProvider'
import { useState, useEffect, useRef } from 'react'
import type { VozPaso, ProductoDraft } from '@/lib/voz/tipos'

// ------------------------------------------------------------------
// Helpers de formato
// ------------------------------------------------------------------
function fmt(n: number): string {
  return n.toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  })
}

/** Devuelve los campos ya completados del draft para mostrar en el resumen */
function camposDraft(
  draft: ProductoDraft
): { k: string; v: string }[] {
  const out: { k: string; v: string }[] = []

  if (draft.nombre)
    out.push({ k: 'Nombre', v: draft.nombre })

  if (draft.codigoBarras !== undefined)
    out.push({ k: 'Código', v: draft.codigoBarras ?? 'sin código' })

  if (draft.precioVenta !== undefined)
    out.push({ k: 'Venta', v: fmt(draft.precioVenta) })

  if (draft.precioCompra !== undefined)
    out.push({
      k: 'Costo',
      v: draft.precioCompra > 0 ? fmt(draft.precioCompra) : 'omitido',
    })

  if (draft.unidadMedida)
    out.push({ k: 'Unidad', v: draft.unidadMedida })

  if (draft.categoriaId !== undefined)
    out.push({ k: 'Categoría', v: draft.categoriaNombre ?? 'sin categoría' })

  if (draft.tieneVariantes !== undefined) {
    if (draft.tieneVariantes && draft.variantes?.length) {
      const varStr = draft.variantes
        .map((v) =>
          v.colorLabel ? `${v.label} (${v.colorLabel}) ×${v.stock}` : `${v.label}×${v.stock}`
        )
        .join('  ')
      out.push({ k: 'Variantes', v: varStr })
    } else if (draft.tieneVariantes === false) {
      out.push({ k: 'Variantes', v: 'sin variantes' })
    }
  }

  if (!draft.tieneVariantes && draft.stockSimple !== undefined)
    out.push({ k: 'Stock', v: `${draft.stockSimple} u.` })

  if (draft.stockMinimo !== undefined && draft.stockMinimo > 0)
    out.push({ k: 'Stk. mín', v: String(draft.stockMinimo) })

  if (draft.descripcion !== undefined)
    out.push({ k: 'Descripción', v: draft.descripcion ?? 'omitida' })

  return out
}

// ------------------------------------------------------------------
// Orden de pasos en el wizard para calcular índice
// ------------------------------------------------------------------
const PASOS_WIZARD: VozPaso[] = [
  'producto_nombre',
  'producto_codigo_barras',
  'producto_precio_venta',
  'producto_precio_compra',
  'producto_unidad',
  'producto_categoria',
  'producto_categoria_crear',
  'producto_variantes_yn',
  'producto_variantes',
  'producto_variantes_color_yn',
  'producto_variantes_color',
  'producto_variantes_stock',
  'producto_stock_simple',
  'producto_stock_minimo',
  'producto_descripcion',
]

// ------------------------------------------------------------------
// Inputs locales del wizard (se montan de nuevo en cada paso)
// ------------------------------------------------------------------
function VozBarcodeInput({
  onSubmit,
  onOmitir,
}: {
  onSubmit: (val: string) => void
  onOmitir: () => void
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  function submit() {
    const val = value.trim()
    onSubmit(val || 'omitir')
    setValue('')
  }

  return (
    <div className="px-4 pb-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Barcode size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            placeholder="Escanear o escribir código..."
            className="w-full bg-white/10 border border-white/15 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/60"
          />
        </div>
        <button
          type="button"
          onClick={submit}
          className="px-3 py-2 bg-primary hover:bg-primary rounded-xl text-xs font-semibold transition-colors shrink-0"
        >
          OK
        </button>
        <button
          type="button"
          onClick={onOmitir}
          className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs text-white/60 transition-colors shrink-0"
        >
          Omitir
        </button>
      </div>
    </div>
  )
}

function VozNumericInput({
  esPrecioCompra,
  onSubmit,
  onOmitir,
}: {
  esPrecioCompra: boolean
  onSubmit: (val: string) => void
  onOmitir: () => void
}) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [])

  function submit() {
    const val = value.trim()
    if (!val && !esPrecioCompra) return
    onSubmit(val || 'omitir')
    setValue('')
  }

  return (
    <div className="px-4 pb-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm select-none">$</span>
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            min="0"
            step="any"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            placeholder="0"
            className="w-full bg-white/10 border border-white/15 rounded-xl pl-7 pr-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-primary/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!esPrecioCompra && !value.trim()}
          className="px-3 py-2 bg-primary hover:bg-primary disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-semibold transition-colors shrink-0"
        >
          OK
        </button>
        {esPrecioCompra && (
          <button
            type="button"
            onClick={onOmitir}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs text-white/60 transition-colors shrink-0"
          >
            Sin costo
          </button>
        )}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
// Componente
// ------------------------------------------------------------------
export function VoiceHUD() {
  const {
    paso,
    draft,
    preguntaActual,
    opcionesActuales,
    textoInterim,
    textoFinal,
    error,
    cancelar,
    seleccionarOpcion,
    esMultiSelect,
    seleccionMultiple,
    toggleOpcionMulti,
    confirmarSeleccionMultiple,
  } = useVoz()

  const PASOS_INPUT_NUMERICO: VozPaso[] = ['producto_precio_venta', 'producto_precio_compra']
  const esInputNumerico = PASOS_INPUT_NUMERICO.includes(paso)
  const esPrecioCompra = paso === 'producto_precio_compra'

  if (paso === 'inactivo') return null
  if (paso === 'producto_confirmar') return null

  const esFlujoProducto = paso.startsWith('producto_')
  const esGuardando = paso === 'producto_guardando'
  const esListo = paso === 'producto_listo'
  const esError = paso === 'producto_error'
  const esBarcode = paso === 'producto_codigo_barras'

  const pasoIdx = PASOS_WIZARD.indexOf(paso)
  const campos = esFlujoProducto ? camposDraft(draft) : []

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-(--z-modal) w-[min(94vw,480px)] pointer-events-none">
      <div className="bg-gray-950/98 backdrop-blur-sm text-white rounded-2xl shadow-2xl overflow-hidden pointer-events-auto border border-white/10">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            {!esGuardando && !esListo && !esError && (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
            )}
            {esListo && <span className="text-primary text-xs font-bold">✓</span>}
            {esError && <span className="text-red-400 text-xs font-bold">✗</span>}

            <span className="text-xs font-medium text-white/50">
              {esFlujoProducto && pasoIdx >= 0
                ? `Nuevo producto · paso ${pasoIdx + 1}/${PASOS_WIZARD.length}`
                : paso === 'escuchando_nav'
                ? 'Navegación por voz'
                : ''}
            </span>
          </div>

          <button
            onClick={cancelar}
            className="text-white/35 hover:text-white/80 transition-colors p-1 rounded-full -mr-1"
            aria-label="Cancelar"
          >
            <X size={14} />
          </button>
        </div>

        {/* ── Resumen acumulado del draft ─────────────────────────── */}
        {campos.length > 0 && (
          <div className="px-4 pt-3 pb-2 border-b border-white/8 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {campos.map(({ k, v }) => (
              <div key={k} className="flex flex-col min-w-0">
                <span className="text-[9px] uppercase tracking-widest text-white/35 leading-none">
                  {k}
                </span>
                <span className="text-xs text-white/85 truncate font-medium leading-snug mt-0.5">
                  {v}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Pregunta / estado actual ────────────────────────────── */}
        {!esGuardando && !esListo && !esError && preguntaActual && (
          <div className="px-4 py-3 pb-2">
            <p className="text-sm font-semibold leading-snug text-white">{preguntaActual}</p>
          </div>
        )}

        {esGuardando && (
          <div className="px-4 py-3 flex items-center gap-2.5">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-sm text-white/70">Guardando producto...</p>
          </div>
        )}
        {esListo && (
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-primary">¡Producto guardado!</p>
          </div>
        )}
        {esError && (
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-red-400">Error al guardar</p>
            {error && <p className="text-xs text-red-300/80 mt-0.5">{error}</p>}
          </div>
        )}

        {/* ── Input numérico (precio venta / precio compra) ─────────── */}
        {esInputNumerico && !esGuardando && !esListo && !esError && (
          <VozNumericInput
            key={paso}
            esPrecioCompra={esPrecioCompra}
            onSubmit={(val) => seleccionarOpcion(val)}
            onOmitir={() => seleccionarOpcion('omitir')}
          />
        )}

        {/* ── Input de código de barras (scanner USB o manual) ──────── */}
        {esBarcode && !esGuardando && !esListo && !esError && (
          <VozBarcodeInput
            key="barcode"
            onSubmit={(val) => seleccionarOpcion(val)}
            onOmitir={() => seleccionarOpcion('omitir')}
          />
        )}

        {/* ── Multi-select chips (tallas o colores) ─────────────────── */}
        {esMultiSelect && opcionesActuales.length > 0 && !esGuardando && !esListo && !esError && (
          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {opcionesActuales.map((op) => {
                const seleccionado = seleccionMultiple.includes(op.valor)
                return (
                  <button
                    key={op.valor}
                    onClick={() => toggleOpcionMulti(op.valor)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${
                      seleccionado
                        ? 'bg-primary border-primary text-white'
                        : 'bg-white/10 border-white/10 text-white/70 hover:bg-white/15'
                    }`}
                  >
                    {op.sublabel && (
                      <span
                        className="w-3 h-3 rounded-full border border-white/30 shrink-0"
                        style={{ background: op.sublabel }}
                      />
                    )}
                    {seleccionado && !op.sublabel && <Check size={10} className="shrink-0" />}
                    {op.label}
                  </button>
                )
              })}
            </div>
            <button
              onClick={confirmarSeleccionMultiple}
              disabled={seleccionMultiple.length === 0}
              className="w-full py-2 bg-primary hover:bg-primary disabled:opacity-30 disabled:cursor-not-allowed rounded-xl text-sm font-semibold transition-colors"
            >
              Confirmar {seleccionMultiple.length > 0 ? `(${seleccionMultiple.length} seleccionados)` : ''}
            </button>
          </div>
        )}

        {/* ── Opciones clickeables simples (single-select) ───────────── */}
        {!esMultiSelect && !esBarcode && opcionesActuales.length > 0 && !esGuardando && !esListo && !esError && (
          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {opcionesActuales.map((op) => (
                <button
                  key={op.valor}
                  onClick={() => seleccionarOpcion(op.valor)}
                  className="inline-flex flex-col items-start px-3 py-1.5 bg-white/10 hover:bg-primary/40 active:bg-primary/60 rounded-xl text-xs font-medium transition-colors border border-white/10 hover:border-primary/50"
                >
                  <span className="leading-snug">{op.label}</span>
                  {op.sublabel && (
                    <span className="text-[10px] text-white/45 leading-none mt-0.5">
                      {op.sublabel}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Texto interim ───────────────────────────────────────────── */}
        {(textoInterim || textoFinal) && !esGuardando && !esListo && !esError && !esMultiSelect && !esBarcode && (
          <div className="px-4 pb-3 border-t border-white/5 pt-2">
            <p className="text-[11px] text-white/35 italic truncate">
              🎙 &ldquo;{textoInterim || textoFinal}&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
