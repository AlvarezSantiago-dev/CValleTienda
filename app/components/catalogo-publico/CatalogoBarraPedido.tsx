'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { formatARS } from '@/lib/format'
import { leerCarrito, qtyCarrito, totalCarrito } from '@/lib/catalogo/carrito'

function esRutaSinBarra(pathname: string): boolean {
  return /\/(carrito|checkout|pedido-enviado)\/?$/.test(pathname)
}

export function CatalogoBarraPedido({ slug }: { slug: string }) {
  const pathname = usePathname()
  const [qty, setQty] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    function sync() {
      const cart = leerCarrito(slug)
      setQty(qtyCarrito(cart))
      setTotal(totalCarrito(cart))
    }
    sync()
    window.addEventListener('storage', sync)
    window.addEventListener('cvalle-cat-cart', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('cvalle-cat-cart', sync)
    }
  }, [slug])

  if (qty <= 0 || esRutaSinBarra(pathname)) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-(--z-nav) border-t border-border-default bg-surface/95 backdrop-blur-sm pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="max-w-5xl mx-auto px-4 pt-3">
        <Link
          href={`/c/${slug}/carrito`}
          className="flex items-center gap-3 min-h-11 rounded-[var(--radius-md)] bg-primary text-primary-fg px-4 focus-ring"
        >
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-semibold">Ver pedido</span>
            <span className="block text-xs text-primary-fg/80">
              {qty} {qty === 1 ? 'ítem' : 'ítems'}
            </span>
          </span>
          <span className="text-sm font-semibold tabular-nums shrink-0">{formatARS(total)}</span>
          <ChevronRight size={18} aria-hidden className="shrink-0 opacity-80" />
        </Link>
      </div>
    </div>
  )
}
