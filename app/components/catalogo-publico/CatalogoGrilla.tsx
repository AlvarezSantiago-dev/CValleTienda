'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatARS } from '@/lib/format'
import type { ProductoCatalogoPublico } from '@/lib/catalogo/types'
import { textoStockGrilla } from '@/lib/catalogo/stock'
import { CatalogoPlaceholder } from './CatalogoPlaceholder'
import { CatalogoBuscador } from './CatalogoBuscador'

function coincideBusqueda(p: ProductoCatalogoPublico, q: string): boolean {
  const n = q.trim().toLowerCase()
  if (!n) return true
  if (p.nombre.toLowerCase().includes(n)) return true
  return (p.packs ?? []).some((pk) => {
    const label = (pk.nombre ?? `pack x${pk.unidades}`).toLowerCase()
    return label.includes(n) || `x${pk.unidades}`.includes(n) || String(pk.unidades) === n
  })
}

function precioDesde(p: ProductoCatalogoPublico): { min: number; hayDesde: boolean } {
  const unitMin = Math.min(...p.variantes.map((v) => v.precio_venta), p.precio_venta)
  const packs = p.packs ?? []
  const packMin = packs.length > 0 ? Math.min(...packs.map((pk) => pk.precio)) : Infinity
  const min = Math.min(unitMin, packMin)
  const hayDesde =
    packs.length > 0 || p.variantes.some((v) => v.precio_venta !== unitMin)
  return { min, hayDesde }
}

export function CatalogoGrilla({
  slug,
  productos,
}: {
  slug: string
  productos: ProductoCatalogoPublico[]
}) {
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const filtrados = useMemo(
    () => productos.filter((p) => coincideBusqueda(p, qDebounced)),
    [productos, qDebounced]
  )

  if (productos.length === 0) {
    return (
      <p className="text-center text-sm text-fg-muted py-16">
        Todavía no hay productos en este catálogo.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <CatalogoBuscador value={q} onChange={setQ} onQuery={setQDebounced} />
      {filtrados.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-sm text-fg-muted">
            No hay productos con «{qDebounced.trim()}».
          </p>
          <button
            type="button"
            onClick={() => {
              setQ('')
              setQDebounced('')
            }}
            className="text-sm text-fg-brand min-h-11 px-2 rounded-[var(--radius-md)] focus-ring"
          >
            Limpiar búsqueda
          </button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {filtrados.map((p) => {
            const { min, hayDesde } = precioDesde(p)
            const stockCard = textoStockGrilla(p.variantes)
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
                    <p className="text-sm font-semibold text-fg-brand tabular-nums">
                      {hayDesde ? `Desde ${formatARS(min)}` : formatARS(min)}
                    </p>
                    {p.tramos.length > 0 && (
                      <p className="text-xs text-fg-muted">Dto. por cantidad</p>
                    )}
                    {(p.packs?.length ?? 0) > 0 && (
                      <p className="text-xs text-fg-muted">Unidad y packs</p>
                    )}
                    {stockCard && (
                      <p
                        className={`text-xs ${
                          stockCard.tono === 'agotado' ? 'text-danger-soft-fg' : 'text-fg-muted'
                        }`}
                      >
                        {stockCard.texto}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
