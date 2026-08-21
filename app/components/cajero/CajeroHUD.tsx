'use client'

// =============================================================
// CajeroHUD — panel del Cajero Hablado: transcript, respuesta y
// propuesta pendiente con Confirmar / Cancelar.
// =============================================================

import { Mic, Loader2, Volume2, X, AlertTriangle } from 'lucide-react'
import { useCajero } from './CajeroProvider'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import { formatARS } from '@/lib/format-moneda'
import type { PropuestaPendiente } from '@/lib/cajero/tipos'

function PropuestaBloque({ propuesta }: { propuesta: PropuestaPendiente }) {
  if (propuesta.tipo === 'venta') {
    return (
      <div className="rounded-[var(--radius-md)] border border-border-default bg-surface-sunken p-3 space-y-1.5">
        {propuesta.items.map((it) => (
          <div key={it.variante_id} className="flex justify-between gap-3 text-[13px]">
            <span className="text-fg truncate">
              {it.cantidad} × {it.etiqueta}
            </span>
            <span className="font-mono text-fg shrink-0">{formatARS(it.subtotal)}</span>
          </div>
        ))}
        <div className="flex justify-between gap-3 border-t border-border-default pt-1.5 text-sm font-semibold">
          <span className="text-fg">Total</span>
          <span className="font-mono text-fg">{formatARS(propuesta.total)}</span>
        </div>
        {propuesta.recibido != null && (
          <div className="flex justify-between gap-3 text-[13px] text-fg-muted">
            <span>Recibido</span>
            <span className="font-mono">{formatARS(propuesta.recibido)}</span>
          </div>
        )}
        {propuesta.faltante != null && (
          <div className="flex justify-between gap-3 text-[13px] text-danger font-medium">
            <span>Faltan</span>
            <span className="font-mono">{formatARS(propuesta.faltante)}</span>
          </div>
        )}
        {propuesta.vuelto != null && (
          <div className="flex justify-between gap-3 text-[13px] font-medium text-fg">
            <span>Vuelto</span>
            <span className="font-mono">{formatARS(propuesta.vuelto)}</span>
          </div>
        )}
        {propuesta.cliente_nombre && (
          <p className="text-[12px] text-fg-muted">Cliente: {propuesta.cliente_nombre}</p>
        )}
      </div>
    )
  }

  if (propuesta.tipo === 'producto') {
    return (
      <div className="rounded-[var(--radius-md)] border border-border-default bg-surface-sunken p-3 space-y-1 text-[13px]">
        <p className="font-semibold text-sm text-fg">{propuesta.nombre}</p>
        <div className="flex justify-between gap-3">
          <span className="text-fg-muted">Precio de venta</span>
          <span className="font-mono text-fg">{formatARS(propuesta.precio_venta)}</span>
        </div>
        {propuesta.precio_compra > 0 && (
          <div className="flex justify-between gap-3">
            <span className="text-fg-muted">Precio de compra</span>
            <span className="font-mono text-fg">{formatARS(propuesta.precio_compra)}</span>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <span className="text-fg-muted">Código</span>
          <span className="font-mono text-fg">{propuesta.codigo_barras}</span>
        </div>
        {propuesta.stock_inicial > 0 && (
          <div className="flex justify-between gap-3">
            <span className="text-fg-muted">Stock inicial</span>
            <span className="font-mono text-fg">{propuesta.stock_inicial}</span>
          </div>
        )}
        {propuesta.variantes && propuesta.variantes.length > 0 && (
          <div className="pt-1.5 border-t border-border-default space-y-0.5">
            <p className="text-[12px] text-fg-muted">
              {propuesta.variantes.length === 1 && propuesta.variantes[0].etiqueta === 'Única'
                ? 'Sin variantes extra'
                : `${propuesta.variantes.length} variantes`}
            </p>
            {!(propuesta.variantes.length === 1 && propuesta.variantes[0].etiqueta === 'Única') &&
              propuesta.variantes.map((v) => (
                <p key={v.codigo_barras} className="text-[12px] text-fg truncate">
                  {v.etiqueta}
                </p>
              ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-border-default bg-surface-sunken p-3 text-[13px] space-y-1">
      <p className="font-semibold text-sm text-fg">{propuesta.etiqueta}</p>
      <div className="flex items-center gap-2">
        <span className="font-mono text-fg-muted line-through">
          {formatARS(propuesta.precio_actual)}
        </span>
        <span className="text-fg-muted">→</span>
        <span className="font-mono font-semibold text-fg">
          {formatARS(propuesta.precio_nuevo)}
        </span>
      </div>
    </div>
  )
}

export function CajeroHUD() {
  const {
    disponible,
    fase,
    transcript,
    respuesta,
    error,
    conversacion,
    esperandoConfirmacion,
    confirmar,
    cancelar,
    cerrar,
  } = useCajero()

  if (!disponible) return null

  const visible =
    fase !== 'inactivo' || !!transcript || !!respuesta || esperandoConfirmacion || !!error
  if (!visible) return null

  return (
    <div className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] lg:bottom-24 right-3 sm:right-6 z-(--z-toast) w-[min(94vw,380px)] print:hidden">
      <div className="rounded-[var(--radius-lg)] border border-border-default bg-surface shadow-lg p-4 space-y-3">
        {/* Header de estado */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-fg">
            {fase === 'grabando' && (
              <>
                <Mic size={16} className="text-danger animate-pulse" />
                Escuchando… soltá para enviar
              </>
            )}
            {fase === 'procesando' && (
              <>
                <Loader2 size={16} className="animate-spin text-fg-muted" />
                Pensando…
              </>
            )}
            {fase === 'hablando' && (
              <>
                <Volume2 size={16} className="text-fg-brand" />
                Cajero
              </>
            )}
            {fase === 'error' && (
              <>
                <AlertTriangle size={16} className="text-danger" />
                Error
              </>
            )}
            {fase === 'inactivo' && (
              <>
                <Mic size={16} className="text-fg-muted" />
                Cajero
              </>
            )}
          </div>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="text-fg-muted hover:text-fg focus-ring rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Transcript del usuario */}
        {transcript && (
          <p className="text-[13px] text-fg-muted italic">&ldquo;{transcript}&rdquo;</p>
        )}

        {/* Respuesta del agente */}
        {respuesta && fase !== 'grabando' && (
          <p className="text-sm text-fg">{respuesta}</p>
        )}

        {error && <p className="text-[13px] text-danger">{error}</p>}

        {/* Propuesta pendiente */}
        {esperandoConfirmacion && conversacion.propuestaPendiente && fase !== 'procesando' && (
          <>
            <PropuestaBloque propuesta={conversacion.propuestaPendiente} />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={confirmar}>
                Confirmar
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={cancelar}>
                Cancelar
              </Button>
            </div>
          </>
        )}

        <p
          className={cn(
            'text-[11px] text-fg-muted',
            fase === 'grabando' && 'text-danger'
          )}
        >
          Mantené el micrófono o{' '}
          <kbd className="font-mono border border-border-default rounded px-1">F8</kbd> y hablá.
          Soltá para enviar.
        </p>
      </div>
    </div>
  )
}
