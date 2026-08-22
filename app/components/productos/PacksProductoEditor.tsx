'use client'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ImagenProductoUpload } from './ImagenProductoUpload'
import { TramosCantidadEditor } from './TramosCantidadEditor'
import { MAX_PACKS, type ProductoPackInput } from '@/lib/packs/types'
import { labelPack } from '@/lib/packs/virtual'
import type { TramoCantidad } from '@/lib/precios/tramos-cantidad'

function packVacio(orden: number): ProductoPackInput {
  return {
    unidades: 0,
    precio: 0,
    codigo_barras: '',
    imagen_url: null,
    nombre: '',
    orden,
    recargo_cc_pct: null,
    tramos: [],
  }
}

interface PacksProductoEditorProps {
  productoId: string | null
  value: ProductoPackInput[]
  onChange: (next: ProductoPackInput[]) => void
  onFilePendiente?: (tempKey: string, file: File | null) => void
  precioCompra?: number
  precioVentaUnidad?: number
  usarPedidoCc?: boolean
}

function hintPrecioUnidadPack(
  unidades: number,
  precioPack: number,
  precioCompra: number,
  precioVentaUnidad: number
): { text: string; className: string } | null {
  if (unidades < 2 || precioPack <= 0) return null
  const precioUnidad = precioPack / unidades
  const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`

  if (precioCompra > 0) {
    const ganancia = precioUnidad - precioCompra
    const margen = (ganancia / precioCompra) * 100
    let colorClass = 'text-fg-subtle'
    let prefijo = ''
    if (margen < 0) {
      colorClass = 'text-danger-soft-fg'
      prefijo = '⚠️ '
    } else if (margen < 10) {
      colorClass = 'text-amber-600'
      prefijo = '⚡ '
    } else if (margen >= 20) {
      colorClass = 'text-fg-brand'
      prefijo = '✓ '
    }
    let vsSuelta = ''
    if (precioVentaUnidad > 0) {
      const delta = precioUnidad - precioVentaUnidad
      if (Math.abs(delta) < 0.5) vsSuelta = ' · igual que suelta'
      else if (delta < 0) vsSuelta = ` · ${fmt(precioVentaUnidad - precioUnidad)} menos que suelta`
      else vsSuelta = ` · ${fmt(delta)} más que suelta`
    }
    return {
      className: `text-[11px] ${colorClass}`,
      text: `${prefijo}${fmt(precioUnidad)} por unidad · Ganancia: ${margen >= 0 ? '+' : ''}${margen.toFixed(1)}% — ${fmt(ganancia)}${vsSuelta}`,
    }
  }

  return {
    className: 'text-[11px] text-fg-muted',
    text: `${fmt(precioUnidad)} por unidad`,
  }
}

export function PacksProductoEditor({
  productoId,
  value,
  onChange,
  onFilePendiente,
  precioCompra = 0,
  precioVentaUnidad = 0,
  usarPedidoCc = false,
}: PacksProductoEditorProps) {
  function update(i: number, patch: Partial<ProductoPackInput>) {
    onChange(value.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-fg">Packs / cajas</p>
        <p className="text-xs text-fg-muted">
          Ej. Pack x8 y Caja x24 sobre la misma unidad. Vacío = solo se vende suelto. Todas las
          variantes del producto usan estos packs.
        </p>
      </div>
      {value.map((p, i) => {
        const tempKey = p.id ?? `nuevo-${i}`
        const hintUnidad = hintPrecioUnidadPack(
          Number(p.unidades) || 0,
          Number(p.precio) || 0,
          precioCompra,
          precioVentaUnidad
        )
        return (
          <div
            key={tempKey}
            className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface p-3 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide">
                {Number(p.unidades) > 1 ? labelPack(p.unidades, p.nombre) : `Pack ${i + 1}`}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              >
                Quitar
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Unidades por pack"
                type="number"
                min={2}
                step={1}
                value={p.unidades || ''}
                onChange={(e) => update(i, { unidades: Number(e.target.value) || 0 })}
                placeholder="8"
              />
              <Input
                label="Precio del pack"
                type="number"
                min={0}
                step="0.01"
                value={p.precio || ''}
                onChange={(e) => update(i, { precio: Number(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            {hintUnidad && <p className={hintUnidad.className}>{hintUnidad.text}</p>}
            {usarPedidoCc && (
              <Input
                label="Recargo a cuenta (%)"
                type="number"
                step="0.01"
                min="0"
                value={p.recargo_cc_pct ?? ''}
                onChange={(e) => {
                  const raw = e.target.value
                  update(i, {
                    recargo_cc_pct: raw === '' ? null : Math.max(0, Number(raw) || 0),
                  })
                }}
                placeholder="Vacío = recargo del producto"
                hint={
                  Number(p.precio) > 0 && p.recargo_cc_pct != null
                    ? `A cuenta: $${Math.round(Number(p.precio) * (1 + Number(p.recargo_cc_pct) / 100)).toLocaleString('es-AR')} el pack`
                    : 'Vacío hereda el recargo del producto o el default de la tienda.'
                }
              />
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nombre (opcional)"
                value={p.nombre ?? ''}
                onChange={(e) => update(i, { nombre: e.target.value })}
                placeholder="Caja x24"
              />
              <Input
                label="Código de barras"
                value={p.codigo_barras ?? ''}
                onChange={(e) => update(i, { codigo_barras: e.target.value })}
                placeholder="Escanear o dejar vacío"
              />
            </div>
            <ImagenProductoUpload
              productoId={productoId && p.id ? productoId : null}
              imagenUrl={p.imagen_url ?? null}
              kind="pack"
              packId={p.id}
              compact
              etiqueta="Foto del pack"
              onUrlChange={(url) => update(i, { imagen_url: url })}
              onFilePendienteChange={(file) => onFilePendiente?.(tempKey, file)}
            />
            <TramosCantidadEditor
              value={p.tramos}
              onChange={(tramos: TramoCantidad[]) => update(i, { tramos })}
              unidadLabel="packs"
              titulo="Descuento por cantidad de packs"
              ayuda="A partir de N packs de este tamaño, X % off. No se mezcla con unidades sueltas ni con otros packs."
            />
          </div>
        )
      })}
      {value.length < MAX_PACKS && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange([...value, packVacio(value.length)])}
        >
          Agregar pack
        </Button>
      )}
    </div>
  )
}
