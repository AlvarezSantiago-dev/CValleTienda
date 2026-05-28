'use client'

import React, { useRef, useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { BarcodeButton } from './BarcodeButton'
import { BotonImprimirEtiquetas } from './BotonImprimirEtiquetas'
import { BotonImprimirEtiquetasProducto } from './BotonImprimirEtiquetasProducto'
import { InlineCreate } from './InlineCreate'
import { MatrizGenerador } from './MatrizGenerador'
import { BulkFill } from './BulkFill'
import { KitComponentesEditor, type KitComponenteState } from './KitComponentesEditor'
import type { Talla, Color } from '@/types/database'
import type { VarianteInput } from '@/app/actions/productos'
import { crearTallaInline, crearColorInline } from '@/app/actions/productos'
import { useRubro } from '@/components/layout/RubroProvider'
import { titleCase, upperCaseTrim } from '@/lib/utils/text'

interface VariantesEditorProps {
  tallas: Talla[]
  colores: Color[]
  initial?: VarianteInput[]
  /** Cuando cambia, el padre obtiene el array completo. */
  onChange: (variantes: VarianteInput[]) => void
  /** En edición, no permite cambiar stock_inicial de variantes existentes */
  modoEdicion?: boolean
  /** Si el producto es un kit, muestra el editor de componentes por variante */
  esKit?: boolean
  /** Componentes iniciales por variante (clave = v.id o String(idx) para nuevas) */
  initialKitComponentes?: Record<string, KitComponenteState[]>
  /** Callback cuando cambian los componentes del kit */
  onKitComponentesChange?: (byVariante: Record<string, KitComponenteState[]>) => void
  /** Id del producto (solo en modo edición) — habilita el botón de imprimir etiquetas del producto completo */
  productoId?: string
}

function emptyVariante(): VarianteInput {
  return {
    talla_id: null,
    color_id: null,
    codigo_barras: null,
    precio_venta: null,
    stock_inicial: 0,
    stock_minimo: 0,
    pack_habilitado: false,
    pack_cantidad: null,
    pack_precio: null,
    pack_codigo_barras: null,
  }
}

export function VariantesEditor({
  tallas: tallasProp,
  colores: coloresProp,
  initial,
  onChange,
  modoEdicion = false,
  esKit = false,
  initialKitComponentes,
  onKitComponentesChange,
  productoId,
}: VariantesEditorProps) {
  const { labelVar1, labelVar2, usarVar2, usarHexVar2, usarPack, rubro } = useRubro()
  const transformVar1 = rubro === 'ropa' ? upperCaseTrim : titleCase
  const transformVar2 = titleCase
  const [variantes, setVariantes] = useState<VarianteInput[]>(
    initial && initial.length > 0 ? initial : [emptyVariante()]
  )
  const [tallasLocales, setTallasLocales] = useState<Talla[]>(tallasProp)
  const [coloresLocales, setColoresLocales] = useState<Color[]>(coloresProp)
  const codigoRefs = useRef<(HTMLInputElement | null)[]>([])
  // Kit: componentes por variante (clave = v.id ?? String(idx))
  const [kitComps, setKitComps] = useState<Record<string, KitComponenteState[]>>(
    initialKitComponentes ?? {}
  )
  function focusCodigo(idx: number, select = false) {
    const el = codigoRefs.current[idx]
    if (!el) return
    el.focus()
    if (select) el.select()
  }

  function emit(next: VarianteInput[]) {
    setVariantes(next)
    onChange(next)
  }

  function updateKitComps(varKey: string, comps: KitComponenteState[]) {
    const next = { ...kitComps, [varKey]: comps }
    setKitComps(next)
    onKitComponentesChange?.(next)
  }

  function update(idx: number, patch: Partial<VarianteInput>) {
    emit(variantes.map((v, i) => (i === idx ? { ...v, ...patch } : v)))
  }

  function add() {
    const next = [...variantes, emptyVariante()]
    emit(next)
    setTimeout(() => focusCodigo(next.length - 1), 0)
  }

  function remove(idx: number) {
    const v = variantes[idx]
    if (v.id) {
      // Variante existente → marcar como eliminada (soft)
      emit(variantes.map((x, i) => (i === idx ? { ...x, eliminar: true } : x)))
    } else {
      // Variante nueva → quitarla del array directamente
      emit(variantes.filter((_, i) => i !== idx))
    }
  }

  function restore(idx: number) {
    emit(variantes.map((x, i) => (i === idx ? { ...x, eliminar: false } : x)))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-800 mr-auto">Variantes</h3>
        {productoId && (
          <BotonImprimirEtiquetasProducto productoId={productoId} />
        )}
        <InlineCreate
          label={labelVar1}
          transform={transformVar1}
          buttonClassName="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
          onConfirm={async (nombre) => {
            const res = await crearTallaInline(nombre)
            if (!res.ok || !res.data) return null
            return res.data
          }}
          onCreated={(item) => {
            setTallasLocales((prev) => [...prev, { id: item.id, nombre: item.nombre, tienda_id: '', orden: 0, activo: true, created_at: '' }])
          }}
        />
        {usarVar2 && (
          <InlineCreate
            label={labelVar2}
            withColor={usarHexVar2}
            transform={transformVar2}
            buttonClassName="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 hover:border-violet-300 transition-colors"
            onConfirm={async (nombre, hex) => {
              const res = await crearColorInline(nombre, hex)
              if (!res.ok || !res.data) return null
              return res.data
            }}
            onCreated={(item) => {
              setColoresLocales((prev) => [...prev, { id: item.id, nombre: item.nombre, tienda_id: '', hex_color: (item as { hex_color?: string | null }).hex_color ?? null, activo: true, created_at: '' }])
            }}
          />
        )}
        <Button type="button" variant="primary" size="sm" onClick={add}>
          + Agregar variante
        </Button>
      </div>

      {usarHexVar2 && (
        <MatrizGenerador
          tallas={tallasLocales}
          colores={coloresLocales}
          labelVar1={labelVar1}
          labelVar2={labelVar2}
          usarVar2={usarVar2}
          variantesActuales={variantes}
          onGenerar={(nuevas) => emit([...variantes, ...nuevas])}
        />
      )}

      <BulkFill variantes={variantes} modoEdicion={modoEdicion} onUpdate={emit} />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-2 py-2 font-medium">{labelVar1}</th>
              {usarVar2 && <th className="text-left px-2 py-2 font-medium">{labelVar2}</th>}
              <th className="text-left px-2 py-2 font-medium">Código de barras</th>
              <th className="text-left px-2 py-2 font-medium w-28">Precio</th>
              <th className="text-left px-2 py-2 font-medium w-28">
                {modoEdicion ? 'Stock' : 'Stock inicial'}
              </th>
              <th className="text-left px-2 py-2 font-medium w-24">Stock mín.</th>
              {!esKit && usarPack && <th className="text-center px-2 py-2 font-medium w-16">Pack</th>}
              {esKit && <th className="text-center px-2 py-2 font-medium w-20">Componentes</th>}
              <th className="px-2 py-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {variantes.map((v, idx) => {
              const isExisting = !!v.id
              const isDeleted = !!v.eliminar
              // Columnas totales para colSpan de la fila pack/kit
              const totalCols = 6 + (usarVar2 ? 1 : 0) + ((esKit || usarPack) ? 1 : 0)
              const varKey = v.id ?? String(idx)
              const currentKitComps = kitComps[varKey] ?? []
              return (
                <React.Fragment key={v.id ?? `new-${idx}`}>
                <tr
                  className={`border-t border-gray-100 ${isDeleted ? 'opacity-40 line-through' : ''}`}
                >
                  <td className="px-2 py-2 align-top">
                    <Select
                      value={v.talla_id ?? ''}
                      onChange={(e) => update(idx, { talla_id: e.target.value || null })}
                      disabled={isDeleted}
                    >
                      <option value="">— sin {labelVar1.toLowerCase()} —</option>
                      {tallasLocales.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nombre}
                        </option>
                      ))}
                    </Select>
                  </td>
                  {usarVar2 && (
                    <td className="px-2 py-2 align-top">
                      <Select
                        value={v.color_id ?? ''}
                        onChange={(e) => update(idx, { color_id: e.target.value || null })}
                        disabled={isDeleted}
                      >
                        <option value="">— sin {labelVar2.toLowerCase()} —</option>
                        {coloresLocales.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </Select>
                    </td>
                  )}
                  <td className="px-2 py-2 align-top">
                    <div className="flex gap-2">
                      <Input
                        ref={(el) => {
                          codigoRefs.current[idx] = el
                        }}
                        value={v.codigo_barras ?? ''}
                        onChange={(e) =>
                          update(idx, { codigo_barras: e.target.value || null })
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const nextIdx = idx + 1
                            if (nextIdx < variantes.length) {
                              focusCodigo(nextIdx, true)
                            } else {
                              add()
                            }
                          }
                        }}
                        placeholder="Escaneá o vacío"
                        disabled={isDeleted}
                      />
                      <button
                        type="button"
                        onClick={() => focusCodigo(idx, true)}
                        disabled={isDeleted}
                        title="Enfocar para escanear"
                        className="px-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50 disabled:opacity-50"
                      >
                        🔍
                      </button>
                      <BarcodeButton
                        onGenerated={(codigo) => update(idx, { codigo_barras: codigo })}
                      />
                    </div>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={v.precio_venta ?? ''}
                      placeholder="auto"
                      onChange={(e) =>
                        update(idx, {
                          precio_venta: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      disabled={isDeleted}
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <Input
                      type="number"
                      min="0"
                      value={v.stock_inicial}
                      disabled={isDeleted || (modoEdicion && isExisting)}
                      title={
                        modoEdicion && isExisting
                          ? 'El stock se modifica desde el módulo de Stock'
                          : ''
                      }
                      onChange={(e) =>
                        update(idx, { stock_inicial: Number(e.target.value || 0) })
                      }
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <Input
                      type="number"
                      min="0"
                      value={v.stock_minimo}
                      onChange={(e) =>
                        update(idx, { stock_minimo: Number(e.target.value || 0) })
                      }
                      disabled={isDeleted}
                    />
                  </td>
                  {/* Toggle Pack (solo si NO es kit y usarPack) */}
                  {!esKit && usarPack && (
                    <td className="px-2 py-2 align-top text-center">
                      <button
                        type="button"
                        disabled={isDeleted}
                        onClick={() =>
                          update(idx, {
                            pack_habilitado: !v.pack_habilitado,
                            pack_cantidad: !v.pack_habilitado ? (v.pack_cantidad ?? 6) : null,
                            pack_precio: !v.pack_habilitado ? (v.pack_precio ?? null) : null,
                          })
                        }
                        className={`text-xs px-2 py-1 rounded-full font-medium transition-colors border ${
                          v.pack_habilitado
                            ? 'bg-lime-100 text-lime-700 border-lime-300'
                            : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300 hover:text-gray-600'
                        } disabled:opacity-40`}
                      >
                        {v.pack_habilitado && v.pack_cantidad ? `×${v.pack_cantidad}` : 'Pack'}
                      </button>
                    </td>
                  )}
                  {/* Indicador de componentes (solo si ES kit) */}
                  {esKit && (
                    <td className="px-2 py-2 align-top text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium border ${
                        currentKitComps.length > 0
                          ? 'bg-purple-100 text-purple-700 border-purple-300'
                          : 'bg-gray-50 text-gray-400 border-gray-200'
                      }`}>
                        {currentKitComps.length > 0 ? `${currentKitComps.length} comp.` : 'Sin comp.'}
                      </span>
                    </td>
                  )}
                  <td className="px-2 py-2 align-top">
                    {isDeleted ? (
                      <button
                        type="button"
                        onClick={() => restore(idx)}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        Restaurar
                      </button>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {isExisting && v.id && (
                          <BotonImprimirEtiquetas
                            varianteId={v.id}
                            stockActual={v.stock_inicial}
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          className="text-xs text-red-600 hover:underline"
                          aria-label="Eliminar variante"
                        >
                          Quitar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                {/* Fila expandible de configuración pack */}
                {!esKit && usarPack && v.pack_habilitado && !isDeleted && (
                  <tr className="bg-lime-50 border-t-0">
                    <td colSpan={totalCols} className="px-3 py-2">
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <span className="text-xs font-semibold text-lime-700 uppercase tracking-wide">Pack de</span>
                        <input
                          type="number"
                          min="2"
                          max="999"
                          value={v.pack_cantidad ?? ''}
                          onChange={(e) => update(idx, { pack_cantidad: Number(e.target.value) || null })}
                          className="w-20 border border-lime-300 rounded px-2 py-1 text-sm text-center bg-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                          placeholder="6"
                        />
                        <span className="text-xs font-semibold text-lime-700 uppercase tracking-wide">unidades • Precio pack $</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={v.pack_precio ?? ''}
                          onChange={(e) => update(idx, { pack_precio: Number(e.target.value) || null })}
                          className="w-32 border border-lime-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                          placeholder="11000"
                        />
                        {v.pack_cantidad && v.pack_precio ? (
                          <span className="text-xs text-lime-600">
                            ≈ ${(v.pack_precio / v.pack_cantidad).toFixed(0)}/u
                          </span>
                        ) : null}
                        <span className="text-xs font-semibold text-lime-700 uppercase tracking-wide ml-2">Cód. barras pack</span>
                        <input
                          type="text"
                          value={v.pack_codigo_barras ?? ''}
                          onChange={(e) => update(idx, { pack_codigo_barras: e.target.value || null })}
                          className="w-40 border border-lime-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-lime-400"
                          placeholder="Escanear o ingresar"
                        />
                      </div>
                    </td>
                  </tr>
                )}
                {/* Fila expandible de componentes de kit */}
                {esKit && !isDeleted && (
                  <tr className="bg-purple-50 border-t-0">
                    <td colSpan={totalCols} className="px-3 py-3">
                      <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">
                        Componentes de esta variante del kit
                      </p>
                      <KitComponentesEditor
                        value={currentKitComps}
                        onChange={(comps) => updateKitComps(varKey, comps)}
                        kitVarianteId={v.id}
                      />
                    </td>
                  </tr>
                )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">
        Si dejás &quot;Precio&quot; vacío, la variante usa el precio del producto.
      </p>
    </div>
  )
}
