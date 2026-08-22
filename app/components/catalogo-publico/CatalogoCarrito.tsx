'use client'

import { useEffect, useState } from 'react'
import { LinkButton } from '@/components/ui/Button'
import { formatARS } from '@/lib/format'
import { claveLineaCarrito, guardarCarrito, leerCarrito, recostearItemCarrito, totalCarrito } from '@/lib/catalogo/carrito'
import { maxQtyCatalogoLinea } from '@/lib/catalogo/stock'
import type { CartItem } from '@/lib/catalogo/types'
import { CatalogoPlaceholder } from './CatalogoPlaceholder'
import { CatalogoQtyStepper } from './CatalogoQtyStepper'
import { descuentoPctTramo } from '@/lib/precios/tramos-cantidad'

export function CatalogoCarrito({ slug }: { slug: string }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setItems(leerCarrito(slug).map(recostearItemCarrito))
    setReady(true)
  }, [slug])

  function persist(next: CartItem[]) {
    setItems(next)
    guardarCarrito(slug, next)
    window.dispatchEvent(new Event('cvalle-cat-cart'))
  }

  if (!ready) return null

  if (items.length === 0) {
    return (
      <div className="text-center py-16 space-y-3">
        <p className="text-fg font-medium">Tu pedido está vacío</p>
        <LinkButton href={`/c/${slug}`} variant="secondary">
          Ver catálogo
        </LinkButton>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <LinkButton href={`/c/${slug}`} variant="secondary" className="w-full">
          Seguir comprando
        </LinkButton>
      </div>
      <ul className="space-y-3 pb-36">
        {items.map((it) => {
          const pct = descuentoPctTramo(it.tramos ?? [], it.qty)
          const topeStock = maxQtyCatalogoLinea(items, it)
          const excede = it.qty > topeStock
          return (
            <li
              key={claveLineaCarrito(it)}
              className="flex gap-3 rounded-[var(--radius-lg)] border border-border-subtle bg-surface p-3"
            >
              <div className="h-[72px] w-[72px] rounded-[var(--radius-md)] overflow-hidden bg-surface-sunken shrink-0">
                {it.imagen ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imagen} alt="" className="w-full h-full object-cover" />
                ) : (
                  <CatalogoPlaceholder nombre={it.nombre} />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="text-sm font-medium text-fg line-clamp-2 leading-snug">{it.nombre}</p>
                  <p className="text-xs text-fg-muted">
                    {[it.color, it.talla, it.packLabel].filter(Boolean).join(' · ') || '—'}
                  </p>
                  {pct > 0 && (
                    <p className="text-xs text-success-soft-fg">
                      <span className="line-through text-fg-muted mr-1.5 tabular-nums">
                        {formatARS((it.precioLista ?? it.precio) * it.qty)}
                      </span>
                      Dto. −{pct} %
                    </p>
                  )}
                  {excede && (
                    <p className="text-xs text-danger-soft-fg">
                      {it.packUnidades && it.packUnidades > 1
                        ? `Solo hay ${topeStock} ${it.packLabel ?? 'packs'} con el stock actual`
                        : `Solo hay ${topeStock} u. en stock`}
                    </p>
                  )}
                  {!excede && it.qty >= topeStock && topeStock > 0 && (
                    <p className="text-xs text-fg-muted">
                      {it.packUnidades && it.packUnidades > 1
                        ? `Máximo ${topeStock} ${it.packLabel ?? 'packs'} · el pack lleva ${it.packUnidades} u.`
                        : `Máximo ${topeStock} u.`}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <CatalogoQtyStepper
                    value={it.qty}
                    max={Math.max(1, topeStock || it.qty)}
                    onChange={(q) =>
                      persist(
                        items.map((x) =>
                          claveLineaCarrito(x) === claveLineaCarrito(it)
                            ? recostearItemCarrito({ ...x, qty: Math.min(q, topeStock || q) })
                            : x
                        )
                      )
                    }
                  />
                  <p className="text-sm font-semibold tabular-nums shrink-0">
                    {formatARS(it.precio * it.qty)}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs text-danger-soft-fg min-h-11 -ml-1 px-1 rounded-[var(--radius-md)] focus-ring"
                  onClick={() => persist(items.filter((x) => claveLineaCarrito(x) !== claveLineaCarrito(it)))}
                >
                  Quitar
                </button>
              </div>
            </li>
          )
        })}
      </ul>
      <div className="fixed bottom-0 inset-x-0 z-(--z-nav) border-t border-border-default bg-surface/95 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-lg mx-auto px-4 pt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-fg-muted">Total (sin envío)</span>
            <span className="font-semibold tabular-nums text-fg">{formatARS(totalCarrito(items))}</span>
          </div>
          <LinkButton href={`/c/${slug}/checkout`} className="w-full">
            Continuar
          </LinkButton>
        </div>
      </div>
    </div>
  )
}
