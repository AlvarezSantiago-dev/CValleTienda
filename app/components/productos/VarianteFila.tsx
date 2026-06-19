'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { BarcodeButton } from './BarcodeButton'
import { VariantesAccionesMenu } from './VariantesAccionesMenu'
import type { Talla, Color } from '@/types/database'
import type { VarianteInput } from '@/app/actions/productos'
import { labelVariante } from '@/lib/productos/variantes-estado'

export interface VarianteFilaProps {
  variante: VarianteInput
  idx: number
  modoEdicion: boolean
  labelVar1: string
  labelVar2: string
  usarVar2: boolean
  usarPack: boolean
  esKit: boolean
  masColumnas: boolean
  tallas: Talla[]
  colores: Color[]
  precioProducto?: number | null
  currentKitCompsCount: number
  codigoRef: (el: HTMLInputElement | null) => void
  stockRef: (el: HTMLInputElement | null) => void
  onUpdate: (patch: Partial<VarianteInput>) => void
  onRemove: () => void
  onRestore: () => void
  onCodigoEnter: () => void
  onStockEnter: () => void
  rowRef?: (el: HTMLDivElement | null) => void
  /** Alterna fondo para diferenciar variantes consecutivas */
  esAlternada?: boolean
  children?: ReactNode
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="block text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
      {children}
    </span>
  )
}

function CodigoCell({
  variante,
  isDeleted,
  codigoRef,
  onUpdate,
  onCodigoEnter,
}: Pick<VarianteFilaProps, 'variante' | 'codigoRef' | 'onUpdate' | 'onCodigoEnter'> & {
  isDeleted: boolean
}) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Input
        ref={codigoRef}
        value={variante.codigo_barras ?? ''}
        onChange={(e) => onUpdate({ codigo_barras: e.target.value || null })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            onCodigoEnter()
          }
        }}
        placeholder="Escaneá o vacío"
        disabled={isDeleted}
        className="flex-1 min-w-0"
      />
      <BarcodeButton
        compact
        disabled={isDeleted}
        onGenerated={(codigo) => onUpdate({ codigo_barras: codigo })}
      />
    </div>
  )
}

function PrecioCell({
  variante,
  isDeleted,
  precioProducto,
  onUpdate,
}: Pick<VarianteFilaProps, 'variante' | 'precioProducto' | 'onUpdate'> & { isDeleted: boolean }) {
  const usaPrecioProducto = variante.precio_venta == null && precioProducto != null && precioProducto > 0
  return (
    <Input
      type="number"
      step="0.01"
      min="0"
      value={variante.precio_venta ?? ''}
      placeholder={usaPrecioProducto ? String(precioProducto) : 'auto'}
      title={usaPrecioProducto ? `Vacío = usa $${precioProducto} del producto` : undefined}
      onChange={(e) =>
        onUpdate({
          precio_venta: e.target.value === '' ? null : Number(e.target.value),
        })
      }
      disabled={isDeleted}
    />
  )
}

function StockCell({
  variante,
  modoEdicion,
  isDeleted,
  isExisting,
  stockRef,
  onUpdate,
  onStockEnter,
}: Pick<VarianteFilaProps, 'variante' | 'modoEdicion' | 'stockRef' | 'onUpdate' | 'onStockEnter'> & {
  isDeleted: boolean
  isExisting: boolean
}) {
  if (modoEdicion && isExisting) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-h-9">
        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-gray-100 text-gray-900 font-semibold text-sm tabular-nums">
          {variante.stock_inicial}
        </span>
        {variante.id && (
          <Link
            href={`/stock/${variante.id}`}
            className="text-xs text-lime-700 hover:underline font-medium whitespace-nowrap"
          >
            Ajustar stock →
          </Link>
        )}
      </div>
    )
  }

  return (
    <Input
      ref={stockRef}
      type="number"
      min="0"
      value={variante.stock_inicial}
      disabled={isDeleted || (modoEdicion && isExisting)}
      title={modoEdicion && isExisting ? 'El stock se modifica desde el módulo de Stock' : undefined}
      onChange={(e) => onUpdate({ stock_inicial: Number(e.target.value || 0) })}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          onStockEnter()
        }
      }}
      className={!modoEdicion ? 'font-semibold' : undefined}
    />
  )
}

function AccionesCell({
  variante,
  modoEdicion,
  isDeleted,
  isExisting,
  onRemove,
  onRestore,
}: Pick<VarianteFilaProps, 'variante' | 'modoEdicion' | 'onRemove' | 'onRestore'> & {
  isDeleted: boolean
  isExisting: boolean
}) {
  if (isDeleted) {
    return (
      <button type="button" onClick={onRestore} className="text-xs text-lime-700 hover:underline font-medium">
        Restaurar
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      {modoEdicion && isExisting && variante.id && (
        <VariantesAccionesMenu varianteId={variante.id} stockActual={variante.stock_inicial} />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="text-xs text-red-600 hover:underline font-medium px-1"
        aria-label="Eliminar variante"
      >
        Quitar
      </button>
    </div>
  )
}

export function VarianteFila(props: VarianteFilaProps) {
  const {
    variante: v,
    idx,
    modoEdicion,
    labelVar1,
    labelVar2,
    usarVar2,
    usarPack,
    esKit,
    masColumnas,
    tallas,
    colores,
    currentKitCompsCount,
    precioProducto,
    codigoRef,
    stockRef,
    rowRef,
    onUpdate,
    onRemove,
    onRestore,
    onCodigoEnter,
    onStockEnter,
    esAlternada = false,
    children,
  } = props

  const isExisting = !!v.id
  const isDeleted = !!v.eliminar
  const badge = labelVariante(v, tallas, colores, {
    var1: labelVar1,
    var2: labelVar2,
    usarVar2,
  })

  const cardBg = esAlternada
    ? 'bg-gray-50/90 border-gray-200'
    : 'bg-white border-gray-200'
  const rowClass = isDeleted ? 'opacity-50' : ''

  return (
    <article
      ref={rowRef}
      className={`rounded-xl border shadow-sm overflow-hidden transition-colors ${cardBg} ${rowClass} ${
        isDeleted ? 'line-through' : ''
      }`}
      aria-label={`Variante ${idx + 1}: ${badge}`}
    >
      {/* Cabecera: identificador + acciones alineados */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-100/80 bg-white/60">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md bg-gray-900 text-[10px] font-bold text-white">
            {idx + 1}
          </span>
          <span className="text-sm font-semibold text-gray-800 truncate">{badge}</span>
        </div>
        <AccionesCell
          variante={v}
          modoEdicion={modoEdicion}
          isDeleted={isDeleted}
          isExisting={isExisting}
          onRemove={onRemove}
          onRestore={onRestore}
        />
      </div>

      {/* Campos — grid responsive */}
      <div className="p-4 space-y-4">
        <div
          className={`grid gap-3 ${
            usarVar2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
          }`}
        >
          <div>
            <FieldLabel>{labelVar1}</FieldLabel>
            <Select
              value={v.talla_id ?? ''}
              onChange={(e) => onUpdate({ talla_id: e.target.value || null })}
              disabled={isDeleted}
            >
              <option value="">— sin {labelVar1.toLowerCase()} —</option>
              {tallas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </Select>
          </div>
          {usarVar2 && (
            <div>
              <FieldLabel>{labelVar2}</FieldLabel>
              <Select
                value={v.color_id ?? ''}
                onChange={(e) => onUpdate({ color_id: e.target.value || null })}
                disabled={isDeleted}
              >
                <option value="">— sin {labelVar2.toLowerCase()} —</option>
                {colores.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        <div>
          <FieldLabel>Código de barras</FieldLabel>
          <CodigoCell
            variante={v}
            isDeleted={isDeleted}
            codigoRef={codigoRef}
            onUpdate={onUpdate}
            onCodigoEnter={onCodigoEnter}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FieldLabel>{modoEdicion ? 'Stock' : 'Stock inicial'}</FieldLabel>
            <StockCell
              variante={v}
              modoEdicion={modoEdicion}
              isDeleted={isDeleted}
              isExisting={isExisting}
              stockRef={stockRef}
              onUpdate={onUpdate}
              onStockEnter={onStockEnter}
            />
          </div>
          <div>
            <FieldLabel>Precio</FieldLabel>
            <PrecioCell
              variante={v}
              isDeleted={isDeleted}
              precioProducto={precioProducto}
              onUpdate={onUpdate}
            />
          </div>
        </div>

        {masColumnas && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-dashed border-gray-200">
            <div>
              <FieldLabel>Stock mín.</FieldLabel>
              <Input
                type="number"
                min="0"
                value={v.stock_minimo}
                onChange={(e) => onUpdate({ stock_minimo: Number(e.target.value || 0) })}
                disabled={isDeleted}
              />
            </div>
            {!esKit && usarPack && (
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={isDeleted}
                  onClick={() =>
                    onUpdate({
                      pack_habilitado: !v.pack_habilitado,
                      pack_cantidad: !v.pack_habilitado ? (v.pack_cantidad ?? 6) : null,
                      pack_precio: !v.pack_habilitado ? (v.pack_precio ?? null) : null,
                    })
                  }
                  className={`text-xs px-3 py-2 rounded-lg font-medium border w-full sm:w-auto ${
                    v.pack_habilitado
                      ? 'bg-lime-100 text-lime-800 border-lime-300'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {v.pack_habilitado && v.pack_cantidad ? `Pack ×${v.pack_cantidad}` : 'Activar pack'}
                </button>
              </div>
            )}
            {esKit && (
              <div className="flex items-end">
                <span
                  className={`text-xs px-3 py-2 rounded-lg font-medium border inline-block ${
                    currentKitCompsCount > 0
                      ? 'bg-purple-100 text-purple-700 border-purple-300'
                      : 'bg-white text-gray-400 border-gray-200'
                  }`}
                >
                  {currentKitCompsCount > 0 ? `${currentKitCompsCount} componentes` : 'Sin componentes'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {children && (
        <div className="border-t border-gray-100 px-4 py-3 bg-white/40">{children}</div>
      )}
    </article>
  )
}
