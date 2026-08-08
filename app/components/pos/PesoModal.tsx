'use client'

import { useEffect, useRef, useState } from 'react'
import type { VarianteResultado } from '@/lib/pos/queries'
import {
  parseCantidadInput,
  sanitizeCantidadTyping,
} from '@/lib/format-cantidad'
import { totalLinea } from '@/lib/pos/totales-carrito'
import { formatARS } from '@/lib/format-moneda'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface PesoModalProps {
  variante: VarianteResultado
  precioOverride?: number
  cantidadActualEnCarrito: number
  onConfirm: (cantidad: number) => void
  onCancel: () => void
}

function placeholderParaUnidad(unidad: string): string {
  if (unidad === 'gramo') return 'ej: 350'
  if (unidad === 'kg') return 'ej: 1,350'
  if (unidad === 'litro') return 'ej: 0,500'
  if (unidad === 'metro') return 'ej: 2,50'
  return 'ej: 1,0'
}

export function PesoModal({
  variante,
  precioOverride,
  cantidadActualEnCarrito,
  onConfirm,
  onCancel,
}: PesoModalProps) {
  const [valor, setValor] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [])

  const precio = precioOverride ?? variante.precio_venta
  const cantidadNum = parseCantidadInput(valor)
  const esValido = Number.isFinite(cantidadNum) && cantidadNum > 0
  const subtotal = esValido ? totalLinea(precio, cantidadNum) : null

  function handleConfirm() {
    if (!esValido) return
    onConfirm(cantidadNum)
  }

  return (
    <Modal
      open
      onClose={onCancel}
      title={variante.producto_nombre}
      description={[variante.talla, variante.color].filter(Boolean).join(' · ') || undefined}
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!esValido}>
            Agregar al carrito
          </Button>
        </>
      }
    >
      <p className="text-sm text-fg-muted mb-4">
        <span className="font-mono tabular-nums text-fg">{formatARS(precio)}</span>
        {' / '}
        {variante.unidad_de_medida}
        {cantidadActualEnCarrito > 0 && (
          <span className="ml-2 text-fg-brand">
            · ya en carrito: {cantidadActualEnCarrito} {variante.unidad_de_medida}
          </span>
        )}
      </p>

      <label className="block text-xs font-semibold uppercase tracking-wide text-fg-muted mb-2">
        Cantidad ({variante.unidad_de_medida})
      </label>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholderParaUnidad(variante.unidad_de_medida)}
        value={valor}
        onChange={(e) => setValor(sanitizeCantidadTyping(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleConfirm()
          }
        }}
        className="w-full text-2xl font-semibold text-center border-2 border-border-strong rounded-[var(--radius-lg)] px-4 py-3 bg-surface text-fg placeholder:text-fg-subtle focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--border-focus)] transition-colors"
      />
      <p className="text-xs text-fg-subtle mt-1.5 text-center">
        Usá coma o punto (como en la balanza)
      </p>

      <div className="mt-4 bg-surface-sunken rounded-[var(--radius-lg)] px-4 py-3 text-center">
        {subtotal !== null ? (
          <>
            <p className="text-xs text-fg-muted mb-0.5">Subtotal</p>
            <p className="text-2xl font-bold text-fg font-mono tabular-nums">{formatARS(subtotal)}</p>
          </>
        ) : (
          <p className="text-sm text-fg-subtle">Ingresá la cantidad para ver el total</p>
        )}
      </div>
    </Modal>
  )
}
