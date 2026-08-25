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
import { useRubro } from '@/components/layout/RubroProvider'
import { rubroPermiteStockInfinito } from '@/lib/rubro/config'
import { formatStockDisplay } from '@/lib/stock/infinito'

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
  /** En edición: link a ficha de stock del producto */
  productoId?: string
  children?: ReactNode
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="block text-[10px] font-semibold uppercase tracking-wide text-fg-muted mb-1">
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
  productoId,
}: Pick<
  VarianteFilaProps,
  'variante' | 'modoEdicion' | 'stockRef' | 'onUpdate' | 'onStockEnter' | 'productoId'
> & {
  isDeleted: boolean
  isExisting: boolean
}) {
  const { rubro } = useRubro()
  const permiteInfinito = rubroPermiteStockInfinito(rubro)

  if (modoEdicion && isExisting) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-h-9">
        <span className="inline-flex items-center px-2.5 py-1 rounded-[var(--radius-md)] bg-surface-sunken text-fg font-semibold text-sm tabular-nums">
          {formatStockDisplay(variante.stock_inicial, { permiteInfinito })}
        </span>
        {productoId ? (
          <Link
            href={`/stock/producto/${productoId}${variante.id ? `?v=${variante.id}` : ''}`}
            className="text-xs text-fg-brand hover:underline font-medium whitespace-nowrap"
          >
            Ver stock del producto →
          </Link>
        ) : (
          variante.id && (
            <Link
              href={`/stock/${variante.id}`}
              className="text-xs text-fg-brand hover:underline font-medium whitespace-nowrap"
            >
              Ajustar stock →
            </Link>
          )
        )}
      </div>
    )
  }

  return (
    <Input
      ref={stockRef}
      type="number"
      min={permiteInfinito ? -1 : 0}
      title={
        modoEdicion && isExisting
          ? 'El stock se modifica desde el módulo de Stock'
          : permiteInfinito
            ? 'Usá -1 para stock ilimitado'
            : undefined
      }
      value={variante.stock_inicial}
      disabled={isDeleted || (modoEdicion && isExisting)}
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
      <button type="button" onClick={onRestore} className="text-xs text-fg-brand hover:underline font-medium">
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
        className="text-xs text-danger-soft-fg hover:underline font-medium px-1"
        aria-label="Eliminar variante"
      >
        Quitar
      </button>
    </div>
  )
}

export function VarianteFila(props: VarianteFilaProps) {
  const { rubro } = useRubro()
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
    productoId,
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
    ? 'bg-surface-sunken/90 border-border-default'
    : 'bg-surface border-border-default'
  const rowClass = isDeleted ? 'opacity-50' : ''

  return (
    <article
      ref={rowRef}
      className={`rounded-[var(--radius-lg)] border shadow-sm overflow-hidden transition-colors ${cardBg} ${rowClass} ${
        isDeleted ? 'line-through' : ''
      }`}
      aria-label={`Variante ${idx + 1}: ${badge}`}
    >
      {/* Cabecera: identificador + acciones alineados */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border-subtle/80 bg-surface/60">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md bg-gray-900 text-[10px] font-bold text-white">
            {idx + 1}
          </span>
          <span className="text-sm font-semibold text-fg truncate">{badge}</span>
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
              productoId={productoId}
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

        {!esKit && usarPack && rubro !== 'distribuidora' && (
          <div className="pt-1 border-t border-dashed border-border-default">
            <FieldLabel>Venta por pack</FieldLabel>
            <button
              type="button"
              disabled={isDeleted}
              onClick={() =>
                onUpdate({
                  pack_habilitado: !v.pack_habilitado,
                  pack_cantidad: !v.pack_habilitado ? (v.pack_cantidad ?? 6) : null,
                  pack_precio: !v.pack_habilitado ? (v.pack_precio ?? null) : null,
                  pack_codigo_barras: !v.pack_habilitado ? v.pack_codigo_barras : null,
                })
              }
              className={`text-xs px-3 py-2 rounded-[var(--radius-md)] font-medium border w-full sm:w-auto ${
                v.pack_habilitado
                  ? 'bg-primary-soft text-primary-soft-fg border-primary-border'
                  : 'bg-surface text-fg-muted border-border-default hover:border-border-strong'
              }`}
            >
              {v.pack_habilitado && v.pack_cantidad
                ? `Pack activo · ×${v.pack_cantidad} unidades`
                : 'Activar pack (six-pack, caja, etc.)'}
            </button>
            {!v.pack_habilitado && (
              <p className="mt-1 text-[11px] text-fg-muted">
                Activá el pack para definir cantidad, precio del bulto y código de barras del pack.
              </p>
            )}
          </div>
        )}

        {masColumnas && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-dashed border-border-default">
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
            {esKit && (
              <div className="flex items-end">
                <span
                  className={`text-xs px-3 py-2 rounded-[var(--radius-md)] font-medium border inline-block ${
                    currentKitCompsCount > 0
                      ? 'bg-purple-100 text-info-soft-fg border-purple-300'
                      : 'bg-surface text-fg-subtle border-border-default'
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
        <div className="border-t border-border-subtle px-4 py-3 bg-surface/40">{children}</div>
      )}
    </article>
  )
}
