'use client'

import {
  CoverflowCarousel,
  type CoverflowSlide,
} from '@/components/ui/coverflow-carousel'
import type { ProductoDestacadoCatalogo } from '@/lib/catalogo/types'
import { formatARS } from '@/lib/format'

export function CatalogoDestacados({
  slug,
  productos,
}: {
  slug: string
  productos: ProductoDestacadoCatalogo[]
}) {
  if (productos.length === 0) return null

  const slides: CoverflowSlide[] = productos.map((p) => ({
    src: p.imagen_url,
    alt: p.nombre,
    title: p.nombre,
    subtitle: p.hay_desde ? `Desde ${formatARS(p.precio_desde)}` : formatARS(p.precio_desde),
    href: `/c/${slug}/p/${p.id}`,
  }))

  return (
    <section className="mb-8" aria-label="Productos destacados">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.10em] text-fg-subtle mb-2 text-center">
        Destacados
      </h2>
      <CoverflowCarousel
        slides={slides}
        showCaption
        showNavigation={productos.length > 1}
        showPagination={productos.length > 1}
        label="Productos destacados"
        loop={productos.length > 2}
      />
    </section>
  )
}
