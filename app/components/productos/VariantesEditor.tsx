'use client'

import { useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { BotonImprimirEtiquetasProducto } from './BotonImprimirEtiquetasProducto'
import { InlineCreate } from './InlineCreate'
import { MatrizGenerador } from './MatrizGenerador'
import { BulkFill } from './BulkFill'
import { KitComponentesEditor, type KitComponenteState } from './KitComponentesEditor'
import { VariantesResumenBar } from './VariantesResumenBar'
import { VarianteFila } from './VarianteFila'
import type { Talla, Color } from '@/types/database'
import type { VarianteInput } from '@/app/actions/productos'
import { crearTallaInline, crearColorInline } from '@/app/actions/productos'
import { useRubro } from '@/components/layout/RubroProvider'
import { titleCase, upperCaseTrim } from '@/lib/utils/text'
import {
  calcularResumenVariantes,
  indicePrimeraSinCodigo,
  indicePrimeraSinStock,
} from '@/lib/productos/variantes-estado'

interface VariantesEditorProps {
  tallas: Talla[]
  colores: Color[]
  initial?: VarianteInput[]
  onChange: (variantes: VarianteInput[]) => void
  modoEdicion?: boolean
  esKit?: boolean
  initialKitComponentes?: Record<string, KitComponenteState[]>
  onKitComponentesChange?: (byVariante: Record<string, KitComponenteState[]>) => void
  productoId?: string
  precioProducto?: number | null
}

function sortearVariantes(vars: VarianteInput[], tallas: Talla[], colores: Color[]): VarianteInput[] {
  const tallaName = (v: VarianteInput) => tallas.find((t) => t.id === v.talla_id)?.nombre ?? ''
  const colorName = (v: VarianteInput) => colores.find((c) => c.id === v.color_id)?.nombre ?? ''
  function compareTalla(a: string, b: string): number {
    const na = parseFloat(a)
    const nb = parseFloat(b)
    if (!isNaN(na) && !isNaN(nb)) return na - nb
    if (!isNaN(na)) return -1
    if (!isNaN(nb)) return 1
    return a.localeCompare(b, 'es', { sensitivity: 'base' })
  }
  return [...vars].sort((a, b) => {
    const tc = compareTalla(tallaName(a), tallaName(b))
    if (tc !== 0) return tc
    return colorName(a).localeCompare(colorName(b), 'es', { sensitivity: 'base' })
  })
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
  precioProducto,
}: VariantesEditorProps) {
  const { labelVar1, labelVar2, usarVar1, usarVar2, usarHexVar2, usarPack, rubro } = useRubro()
  const transformVar1 = rubro === 'ropa' ? upperCaseTrim : titleCase
  const transformVar2 = titleCase
  const [variantes, setVariantes] = useState<VarianteInput[]>(() => {
    const base = initial && initial.length > 0 ? initial : [emptyVariante()]
    return sortearVariantes(base, tallasProp, coloresProp)
  })
  const [tallasLocales, setTallasLocales] = useState<Talla[]>(tallasProp)
  const [coloresLocales, setColoresLocales] = useState<Color[]>(coloresProp)
  const [masColumnas, setMasColumnas] = useState(false)
  const codigoRefs = useRef<(HTMLInputElement | null)[]>([])
  const stockRefs = useRef<(HTMLInputElement | null)[]>([])
  const filaRefs = useRef<(HTMLDivElement | null)[]>([])
  const [kitComps, setKitComps] = useState<Record<string, KitComponenteState[]>>(
    initialKitComponentes ?? {}
  )

  const resumen = useMemo(
    () => calcularResumenVariantes(variantes, { modoEdicion }),
    [variantes, modoEdicion]
  )

  const mostrarMatriz =
    usarVar1 &&
    tallasLocales.length > 0 &&
    (usarVar2 ? coloresLocales.length > 0 : true)

  function focusCodigo(idx: number, select = false) {
    const el = codigoRefs.current[idx]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    el.focus()
    if (select) el.select()
  }

  function focusStock(idx: number, select = false) {
    const el = stockRefs.current[idx]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    el.focus()
    if (select) el.select()
  }

  function irAFila(idx: number) {
    filaRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    focusCodigo(idx, true)
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

  function autoSort() {
    emit(sortearVariantes(variantes, tallasLocales, coloresLocales))
  }

  function remove(idx: number) {
    const v = variantes[idx]
    if (v.id) {
      emit(variantes.map((x, i) => (i === idx ? { ...x, eliminar: true } : x)))
    } else {
      emit(variantes.filter((_, i) => i !== idx))
    }
  }

  function restore(idx: number) {
    emit(variantes.map((x, i) => (i === idx ? { ...x, eliminar: false } : x)))
  }

  function renderFila(v: VarianteInput, idx: number) {
    const isDeleted = !!v.eliminar
    const varKey = v.id ?? String(idx)
    const currentKitComps = kitComps[varKey] ?? []

    const filaProps = {
      variante: v,
      idx,
      modoEdicion,
      labelVar1,
      labelVar2,
      usarVar2,
      usarPack,
      esKit,
      masColumnas,
      tallas: tallasLocales,
      colores: coloresLocales,
      precioProducto,
      currentKitCompsCount: currentKitComps.length,
      esAlternada: idx % 2 === 1,
      codigoRef: (el: HTMLInputElement | null) => {
        codigoRefs.current[idx] = el
      },
      stockRef: (el: HTMLInputElement | null) => {
        stockRefs.current[idx] = el
      },
      rowRef: (el: HTMLDivElement | null) => {
        filaRefs.current[idx] = el
      },
      onUpdate: (patch: Partial<VarianteInput>) => update(idx, patch),
      onRemove: () => remove(idx),
      onRestore: () => restore(idx),
      onCodigoEnter: () => {
        if (modoEdicion) {
          const nextIdx = idx + 1
          if (nextIdx < variantes.length) focusCodigo(nextIdx, true)
          else add()
        } else {
          focusStock(idx, true)
        }
      },
      onStockEnter: () => {
        const nextIdx = idx + 1
        if (nextIdx < variantes.length) focusCodigo(nextIdx, true)
        else add()
      },
    }

    const footer =
      !esKit && usarPack && v.pack_habilitado && !isDeleted ? (
        renderPackFields(v, idx)
      ) : esKit && !isDeleted ? (
        renderKitEditor(v, varKey, currentKitComps)
      ) : null

    return (
      <VarianteFila key={v.id ?? `new-${idx}`} {...filaProps}>
        {footer}
      </VarianteFila>
    )
  }

  function renderPackFields(v: VarianteInput, idx: number) {
    return (
      <div className="rounded-lg border border-lime-200 bg-lime-50/80 p-3">
        <div className="flex items-center gap-3 text-sm flex-wrap">
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
          <span className="text-xs text-lime-600">≈ ${(v.pack_precio / v.pack_cantidad).toFixed(0)}/u</span>
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
      </div>
    )
  }

  function renderKitEditor(v: VarianteInput, varKey: string, currentKitComps: KitComponenteState[]) {
    return (
      <div className="rounded-lg border border-purple-200 bg-purple-50/80 p-3">
        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">
          Componentes de esta variante del kit
        </p>
        <KitComponentesEditor
          value={currentKitComps}
          onChange={(comps) => updateKitComps(varKey, comps)}
          kitVarianteId={v.id}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-800 mr-auto">Variantes</h3>
        {productoId && <BotonImprimirEtiquetasProducto productoId={productoId} />}
        <InlineCreate
          label={labelVar1}
          transform={transformVar1}
          buttonClassName="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-lime-200 bg-lime-50 text-lime-800 hover:bg-lime-100 hover:border-lime-300 transition-colors"
          onConfirm={async (nombre) => {
            const res = await crearTallaInline(nombre)
            if (!res.ok || !res.data) return null
            return res.data
          }}
          onCreated={(item) => {
            setTallasLocales((prev) => [
              ...prev,
              { id: item.id, nombre: item.nombre, tienda_id: '', orden: 0, activo: true, created_at: '' },
            ])
          }}
        />
        {usarVar2 && (
          <InlineCreate
            label={labelVar2}
            withColor={usarHexVar2}
            transform={transformVar2}
            buttonClassName="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
            onConfirm={async (nombre, hex) => {
              const res = await crearColorInline(nombre, hex)
              if (!res.ok || !res.data) return null
              return res.data
            }}
            onCreated={(item) => {
              setColoresLocales((prev) => [
                ...prev,
                {
                  id: item.id,
                  nombre: item.nombre,
                  tienda_id: '',
                  hex_color: (item as { hex_color?: string | null }).hex_color ?? null,
                  activo: true,
                  created_at: '',
                },
              ])
            }}
          />
        )}
        <button
          type="button"
          onClick={() => setMasColumnas((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors"
        >
          {masColumnas ? 'Menos columnas' : 'Más columnas'}
        </button>
        <button
          type="button"
          onClick={autoSort}
          title="Ordenar por talla (numérico) y color (alfabético)"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:border-gray-300 transition-colors"
        >
          ↕ Ordenar
        </button>
        <Button type="button" variant="primary" size="sm" onClick={add}>
          + Agregar variante
        </Button>
      </div>

      <VariantesResumenBar
        resumen={resumen}
        modoEdicion={modoEdicion}
        onIrIncompleta={irAFila}
        onIrSinCodigo={() => {
          const idx = indicePrimeraSinCodigo(variantes)
          if (idx !== null) irAFila(idx)
        }}
        onIrSinStock={() => {
          const idx = indicePrimeraSinStock(variantes)
          if (idx !== null) {
            filaRefs.current[idx]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            focusStock(idx, true)
          }
        }}
      />

      {mostrarMatriz && (
        <MatrizGenerador
          tallas={tallasLocales}
          colores={coloresLocales}
          labelVar1={labelVar1}
          labelVar2={labelVar2}
          usarVar2={usarVar2}
          variantesActuales={variantes}
          onGenerar={(nuevas) =>
            emit(sortearVariantes([...variantes, ...nuevas], tallasLocales, coloresLocales))
          }
        />
      )}

      <BulkFill
        variantes={variantes}
        modoEdicion={modoEdicion}
        precioProducto={precioProducto}
        onUpdate={emit}
      />

      {/* Lista de variantes — cards responsive en todos los tamaños */}
      <div className="space-y-3">
        {variantes.map((v, idx) => renderFila(v, idx))}
      </div>

      <p className="text-xs text-gray-500">
        Si dejás &quot;Precio&quot; vacío, la variante usa el precio del producto.
        {!modoEdicion && ' Enter en código → stock; Enter en stock → siguiente fila.'}
      </p>
    </div>
  )
}
