'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button, LinkButton } from '@/components/ui/Button'
import { formatARS } from '@/lib/format'
import { guardarCarrito, leerCarrito, recostearItemCarrito, totalCarrito } from '@/lib/catalogo/carrito'
import { MAX_QTY_LINEA } from '@/lib/catalogo/const'
import type { CartItem } from '@/lib/catalogo/types'
import { CatalogoPlaceholder } from './CatalogoPlaceholder'

export function CatalogoCarrito({ slug }: { slug: string }) {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    setItems(leerCarrito(slug).map(recostearItemCarrito))
  }, [slug])

  function persist(next: CartItem[]) {
    setItems(next)
    guardarCarrito(slug, next)
    window.dispatchEvent(new Event('cvalle-cat-cart'))
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-fg font-medium">Tu pedido está vacío</p>
        <LinkButton href={`/c/${slug}`} variant="secondary" size="sm">
          Ver catálogo
        </LinkButton>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {items.map((it) => (
          <li
            key={it.varianteId}
            className="flex gap-3 rounded-[var(--radius-lg)] border border-border-subtle bg-surface p-3"
          >
            <div className="h-16 w-16 rounded-[var(--radius-md)] overflow-hidden bg-surface-sunken shrink-0">
              {it.imagen ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.imagen} alt="" className="w-full h-full object-cover" />
              ) : (
                <CatalogoPlaceholder nombre={it.nombre} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-fg truncate">{it.nombre}</p>
              <p className="text-xs text-fg-muted">
                {[it.color, it.talla].filter(Boolean).join(' · ') || '—'}
              </p>
              <p className="text-sm font-semibold tabular-nums mt-1">
                {formatARS(it.precio * it.qty)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <input
                type="number"
                min={1}
                max={MAX_QTY_LINEA}
                value={it.qty}
                onChange={(e) => {
                  const q = Math.max(1, Math.min(MAX_QTY_LINEA, Number(e.target.value) || 1))
                  persist(
                    items.map((x) =>
                      x.varianteId === it.varianteId
                        ? recostearItemCarrito({ ...x, qty: q })
                        : x
                    )
                  )
                }}
                className="h-8 w-16 rounded-[var(--radius-md)] border border-border-default px-1 text-sm"
              />
              <button
                type="button"
                className="text-xs text-danger-soft-fg"
                onClick={() => persist(items.filter((x) => x.varianteId !== it.varianteId))}
              >
                Quitar
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between text-sm">
        <span className="text-fg-muted">Total (sin envío)</span>
        <span className="font-semibold tabular-nums text-fg">{formatARS(totalCarrito(items))}</span>
      </div>
      <Link href={`/c/${slug}/checkout`} className="block">
        <Button type="button" className="w-full">
          Continuar
        </Button>
      </Link>
    </div>
  )
}
