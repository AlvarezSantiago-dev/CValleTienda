'use client'

import { useEffect, useState } from 'react'
import { leerCarrito, qtyCarrito } from '@/lib/catalogo/carrito'

export function CatalogoCartBadge({ slug }: { slug: string }) {
  const [qty, setQty] = useState(0)

  useEffect(() => {
    function sync() {
      setQty(qtyCarrito(leerCarrito(slug)))
    }
    sync()
    window.addEventListener('storage', sync)
    window.addEventListener('cvalle-cat-cart', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('cvalle-cat-cart', sync)
    }
  }, [slug])

  if (qty <= 0) return null
  return (
    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-fg text-[10px] font-bold flex items-center justify-center">
      {qty > 99 ? '99+' : qty}
    </span>
  )
}
