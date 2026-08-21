import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'
import type { TiendaCatalogoPublica } from '@/lib/catalogo/types'
import { CatalogoCartBadge } from './CatalogoCartBadge'

export function CatalogoHeader({
  tienda,
  slug,
}: {
  tienda: TiendaCatalogoPublica
  slug: string
}) {
  const lugar = [tienda.direccion, tienda.ciudad].filter(Boolean).join(', ')
  return (
    <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur-sm border-b border-border-subtle">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
        <Link href={`/c/${slug}`} className="flex items-center gap-2.5 min-w-0 flex-1 focus-ring rounded-[var(--radius-md)]">
          {tienda.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tienda.logo_url}
              alt=""
              className="h-9 w-9 rounded-[var(--radius-md)] object-cover bg-surface-sunken shrink-0"
            />
          ) : (
            <span className="h-9 w-9 rounded-[var(--radius-md)] bg-primary-soft text-fg-brand flex items-center justify-center text-sm font-bold shrink-0">
              {tienda.nombre.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-fg truncate">{tienda.nombre}</span>
            {lugar && <span className="block text-[11px] text-fg-muted truncate">{lugar}</span>}
          </span>
        </Link>
        <Link
          href={`/c/${slug}/carrito`}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-fg-muted hover:bg-surface-hover hover:text-fg focus-ring"
          aria-label="Carrito"
        >
          <ShoppingBag size={20} aria-hidden />
          <CatalogoCartBadge slug={slug} />
        </Link>
      </div>
    </header>
  )
}
