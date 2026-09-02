'use client'

import { Trash2 } from 'lucide-react'
import { CatalogoQtyStepper } from '@/components/catalogo-publico/CatalogoQtyStepper'
import { CatalogoPlaceholder } from '@/components/catalogo-publico/CatalogoPlaceholder'
import { useRubro } from '@/components/layout/RubroProvider'
import { formatARS } from '@/lib/format'

export type PedidoLineaVista = {
  clave: string
  producto_nombre: string
  talla: string | null
  color: string | null
  cantidad: number
  precio_unitario: number
  imagen_url: string | null
  stock_fisico?: number | null
}

export function PedidoLineaEditor({
  linea,
  max,
  onCantidad,
  onQuitar,
}: {
  linea: PedidoLineaVista
  max: number
  onCantidad: (n: number) => void
  onQuitar: () => void
}) {
  const { labelVar1, labelVar2 } = useRubro()
  const tope = Math.max(0, max)
  const ejes = [
    linea.talla ? `${labelVar1}: ${linea.talla}` : null,
    linea.color ? `${labelVar2}: ${linea.color}` : null,
  ].filter(Boolean)

  return (
    <li className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface p-3 space-y-3">
      <div className="flex gap-3 min-w-0">
        <div className="h-14 w-14 rounded-[var(--radius-md)] overflow-hidden bg-surface-sunken shrink-0">
          {linea.imagen_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={linea.imagen_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <CatalogoPlaceholder nombre={linea.producto_nombre} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg line-clamp-2 leading-snug">{linea.producto_nombre}</p>
          <p className="text-xs text-fg-muted mt-0.5">
            {ejes.join(' · ') || '—'}
            {linea.stock_fisico != null && (
              <>
                {' · '}
                {tope <= 0 ? 'Sin stock' : `Máx. ${tope}`}
              </>
            )}
          </p>
          <p className="text-xs tabular-nums text-fg-muted mt-0.5">
            {formatARS(linea.precio_unitario)} c/u
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <CatalogoQtyStepper
          value={linea.cantidad}
          onChange={onCantidad}
          max={tope}
          min={1}
        />
        <p className="text-sm font-semibold tabular-nums text-fg min-w-0 truncate">
          {formatARS(linea.precio_unitario * linea.cantidad)}
        </p>
        <button
          type="button"
          onClick={onQuitar}
          className="shrink-0 inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-md)] text-fg-muted hover:bg-danger-soft hover:text-danger-soft-fg focus-ring"
          aria-label="Quitar del pedido"
        >
          <Trash2 size={18} aria-hidden />
        </button>
      </div>
    </li>
  )
}
