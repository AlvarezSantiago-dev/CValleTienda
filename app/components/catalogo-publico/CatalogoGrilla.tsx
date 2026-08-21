import Link from 'next/link'
import { formatARS } from '@/lib/format'
import type { ProductoCatalogoPublico } from '@/lib/catalogo/types'
import { CatalogoPlaceholder } from './CatalogoPlaceholder'

export function CatalogoGrilla({
  slug,
  productos,
}: {
  slug: string
  productos: ProductoCatalogoPublico[]
}) {
  if (productos.length === 0) {
    return (
      <p className="text-center text-sm text-fg-muted py-16">
        Todavía no hay productos en este catálogo.
      </p>
    )
  }

  return (
    <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      {productos.map((p) => {
        const precioMin = Math.min(...p.variantes.map((v) => v.precio_venta), p.precio_venta)
        return (
          <li key={p.id}>
            <Link
              href={`/c/${slug}/p/${p.id}`}
              className="block rounded-[var(--radius-lg)] border border-border-subtle bg-surface overflow-hidden hover:border-border-default transition-colors focus-ring"
            >
              <div className="aspect-[4/5] bg-surface-sunken overflow-hidden">
                {p.imagen_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imagen_url}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <CatalogoPlaceholder nombre={p.nombre} />
                )}
              </div>
              <div className="p-2.5 space-y-0.5">
                <p className="text-sm font-medium text-fg line-clamp-2 leading-snug">{p.nombre}</p>
                <p className="text-sm font-semibold text-fg-brand tabular-nums">{formatARS(precioMin)}</p>
                {p.tramos.length > 0 && (
                  <p className="text-[11px] text-fg-muted">Dto. por cantidad</p>
                )}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
