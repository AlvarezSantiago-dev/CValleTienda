'use client'

import { useEffect, useState } from 'react'
import { listarVariantesCambio } from '@/app/actions/devoluciones'
import type { CambioLineaState } from '@/lib/devoluciones/cambio-variante'
import { labelMotivoBloqueo } from '@/lib/devoluciones/cambio-variante'
import type { VarianteCambioOpcion } from '@/lib/devoluciones/queries-cambio'

export interface CambioVarianteFilaProps {
  detalleVentaId: string
  nombreProducto: string
  talla: string | null
  color: string | null
  cantidad: number
  precioUnitario: number
  productoId: string | null
  esKitOBundle: boolean
  value: CambioLineaState
  onChange: (next: CambioLineaState) => void
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

function labelVariante(v: VarianteCambioOpcion): string {
  const parts = [v.talla, v.color].filter(Boolean)
  return parts.length > 0 ? parts.join(' / ') : v.codigo_barras ?? 'Sin talle/color'
}

function OtraVarianteSelector({
  detalleVentaId,
  cantidad,
  value,
  onChange,
}: {
  detalleVentaId: string
  cantidad: number
  value: CambioLineaState
  onChange: (next: CambioLineaState) => void
}) {
  const [opciones, setOpciones] = useState<VarianteCambioOpcion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    listarVariantesCambio(detalleVentaId, cantidad).then((res) => {
      if (cancelled) return
      setLoading(false)
      if (!res.ok) {
        setError(res.error ?? 'Error al cargar variantes')
        setOpciones([])
        return
      }
      setOpciones(res.data ?? [])
    })

    return () => {
      cancelled = true
    }
  }, [detalleVentaId, cantidad])

  const seleccionables = opciones.filter((o) => o.seleccionable)
  const consulta = opciones.filter((o) => !o.seleccionable)

  return (
    <div className="space-y-3">
      {loading && (
        <p className="text-xs text-fg-muted">Cargando variantes disponibles…</p>
      )}
      {error && <p className="text-xs text-danger-soft-fg">{error}</p>}

      {!loading && seleccionables.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide font-semibold text-fg-muted mb-2">
            Seleccioná la variante a entregar
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {seleccionables.map((v) => (
              <label
                key={v.variante_id}
                className={`flex items-start gap-2 border rounded-[var(--radius-md)] p-2.5 cursor-pointer transition-colors ${
                  value.variante_entrega_id === v.variante_id
                    ? 'border-primary bg-primary-soft ring-1 ring-primary'
                    : 'border-border-default bg-surface hover:border-border-default'
                }`}
              >
                <input
                  type="radio"
                  name={`entrega-${detalleVentaId}`}
                  checked={value.variante_entrega_id === v.variante_id}
                  onChange={() =>
                    onChange({
                      subtipo: 'otra_variante',
                      variante_entrega_id: v.variante_id,
                    })
                  }
                  className="mt-0.5 text-fg-brand focus:ring-primary/40"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-fg">
                    {labelVariante(v)}
                  </div>
                  <div className="text-xs text-fg-muted mt-0.5">
                    Stock: {v.stock_actual} · {formatARS(v.precio_venta)}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {!loading && seleccionables.length === 0 && opciones.length === 0 && !error && (
        <p className="text-xs text-warning-soft-fg">
          No hay variantes alternativas con el mismo precio y stock suficiente.
          Usá &quot;Misma variante&quot; o registrá la venta en el POS.
        </p>
      )}

      {!loading && seleccionables.length === 0 && opciones.length > 0 && !error && (
        <p className="text-xs text-warning-soft-fg">
          No hay otra variante seleccionable al mismo precio pagado.
          Usá &quot;Misma variante&quot; si entregás la misma presentación, o el POS si el
          precio difiere.
        </p>
      )}

      {!loading && consulta.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wide font-semibold text-fg-subtle mb-2">
            Otras variantes (solo consulta)
          </p>
          <div className="space-y-1">
            {consulta.map((v) => (
              <div
                key={v.variante_id}
                className="flex items-center justify-between text-xs text-fg-subtle bg-surface/60 border border-border-subtle rounded px-2.5 py-1.5"
              >
                <span>
                  {labelVariante(v)} · Stock {v.stock_actual} ·{' '}
                  {formatARS(v.precio_venta)}
                </span>
                <span className="text-[10px] font-medium uppercase tracking-wide ml-2 shrink-0">
                  {labelMotivoBloqueo(v.motivo_bloqueo)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-fg-subtle mt-2">
            Variantes con otro precio: consultá stock acá; cobrá la diferencia en el POS.
          </p>
        </div>
      )}
    </div>
  )
}

export function CambioVarianteFila({
  detalleVentaId,
  nombreProducto,
  talla,
  color,
  cantidad,
  precioUnitario,
  productoId,
  esKitOBundle,
  value,
  onChange,
}: CambioVarianteFilaProps) {
  const puedeOtraVariante = !!productoId && !esKitOBundle

  return (
    <div className="border border-border-subtle rounded-[var(--radius-md)] p-4 bg-surface-sunken/50">
      <div className="mb-3">
        <div className="font-medium text-sm text-fg">{nombreProducto}</div>
        <div className="text-xs text-fg-muted mt-0.5">
          Devuelve {cantidad}×
          {(talla || color) && ` · ${[talla, color].filter(Boolean).join(' / ')}`}
          {' · '}
          {formatARS(precioUnitario)} c/u
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="radio"
            name={`cambio-${detalleVentaId}`}
            checked={value.subtipo === 'misma_variante'}
            onChange={() => onChange({ subtipo: 'misma_variante' })}
            className="text-fg-brand focus:ring-primary/40"
          />
          Misma variante
        </label>
        <label
          className={`flex items-center gap-2 text-sm ${
            puedeOtraVariante ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'
          }`}
        >
          <input
            type="radio"
            name={`cambio-${detalleVentaId}`}
            checked={value.subtipo === 'otra_variante'}
            disabled={!puedeOtraVariante}
            onChange={() => onChange({ subtipo: 'otra_variante' })}
            className="text-fg-brand focus:ring-primary/40 disabled:opacity-50"
          />
          Otra variante (mismo producto)
        </label>
      </div>

      {esKitOBundle && (
        <p className="text-xs text-warning-soft-fg mb-2">
          Kits y bundles solo permiten reingreso de la misma variante.
        </p>
      )}

      {!productoId && (
        <p className="text-xs text-fg-muted mb-2">
          Este ítem no tiene variantes alternativas; se reingresa la misma unidad.
        </p>
      )}

      {value.subtipo === 'otra_variante' && puedeOtraVariante && (
        <OtraVarianteSelector
          key={`${detalleVentaId}-${cantidad}`}
          detalleVentaId={detalleVentaId}
          cantidad={cantidad}
          value={value}
          onChange={onChange}
        />
      )}
    </div>
  )
}
