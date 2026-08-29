'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatARS } from '@/lib/format'
import type { CategoriaCatalogoPublica, ProductoCatalogoPublico } from '@/lib/catalogo/types'
import { textoStockGrilla } from '@/lib/catalogo/stock'
import { CatalogoPlaceholder } from './CatalogoPlaceholder'
import { CatalogoBuscador } from './CatalogoBuscador'
import { Pagination } from '@/components/ui/Pagination'
import { cn } from '@/components/ui/cn'

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
  categorias,
  haySinCategoria,
  total,
  page,
  pageSize,
  initialQ,
  initialCategoria,
}: {
  slug: string
  productos: ProductoCatalogoPublico[]
  categorias: CategoriaCatalogoPublica[]
  haySinCategoria: boolean
  total: number
  page: number
  pageSize: number
  initialQ: string
  initialCategoria: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [q, setQ] = useState(initialQ)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setQ(initialQ)
  }, [initialQ])

  function navegar(next: { q?: string; categoria?: string | null; page?: number }) {
    const params = new URLSearchParams()
    const qVal = (next.q !== undefined ? next.q : q).trim()
    const cat =
      next.categoria !== undefined ? next.categoria : initialCategoria
    if (qVal) params.set('q', qVal)
    if (cat) params.set('categoria', cat)
    if (next.page && next.page > 1) params.set('page', String(next.page))
    const qs = params.toString()
    startTransition(() => {
      router.push(qs ? `/c/${slug}?${qs}` : `/c/${slug}`)
    })
  }

  function onQueryDebounced(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      navegar({ q: value, page: 1 })
    }, 300)
  }

  function setCategoria(id: string | null) {
    navegar({ categoria: id, page: 1 })
  }

  const vacioTotal = total === 0 && !initialQ && !initialCategoria

  if (vacioTotal) {
    return (
      <p className="text-center text-sm text-fg-muted py-16">
        Todavía no hay productos en este catálogo.
      </p>
    )
  }

  return (
    <div className={cn('space-y-4', isPending && 'opacity-70 transition-opacity')}>
      <CatalogoBuscador value={q} onChange={setQ} onQuery={onQueryDebounced} />

      {(categorias.length > 0 || haySinCategoria) && (
        <div
          className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5 -mx-1 px-1"
          role="listbox"
          aria-label="Filtrar por categoría"
        >
          <Chip
            active={!initialCategoria}
            onClick={() => setCategoria(null)}
            label="Todas"
          />
          {categorias.map((c) => (
            <Chip
              key={c.id}
              active={initialCategoria === c.id}
              onClick={() => setCategoria(c.id)}
              label={c.nombre}
            />
          ))}
          {haySinCategoria && (
            <Chip
              active={initialCategoria === '__sin__'}
              onClick={() => setCategoria('__sin__')}
              label="Sin categoría"
            />
          )}
        </div>
      )}

      {productos.length === 0 ? (
        <div className="text-center py-12 space-y-2">
          <p className="text-sm text-fg-muted">
            {initialQ.trim()
              ? `No hay productos con «${initialQ.trim()}»`
              : 'No hay productos en esta categoría'}
            .
          </p>
          <button
            type="button"
            onClick={() => {
              setQ('')
              startTransition(() => router.push(`/c/${slug}`))
            }}
            className="text-sm text-fg-brand min-h-11 px-2 rounded-[var(--radius-md)] focus-ring"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {productos.map((p) => {
              const { min, hayDesde } = precioDesde(p)
              const stockCard = textoStockGrilla(p.variantes)
              return (
                <li key={p.id}>
                  <Link
                    href={`/c/${slug}/p/${p.id}`}
                    className="block rounded-[var(--radius-lg)] border border-border-subtle bg-surface overflow-hidden hover:border-border-default transition-colors focus-ring"
                  >
                    <div className="relative aspect-[4/5] bg-surface-sunken overflow-hidden">
                      {p.imagen_url ? (
                        <Image
                          src={p.imagen_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 25vw"
                          quality={75}
                        />
                      ) : (
                        <CatalogoPlaceholder nombre={p.nombre} />
                      )}
                    </div>
                    <div className="p-2.5 space-y-0.5">
                      <p className="text-sm font-medium text-fg line-clamp-2 leading-snug">
                        {p.nombre}
                      </p>
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
                            stockCard.tono === 'agotado'
                              ? 'text-danger-soft-fg'
                              : 'text-fg-muted'
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

          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            basePath={`/c/${slug}`}
            searchParams={{
              q: initialQ || undefined,
              categoria: initialCategoria ?? undefined,
            }}
          />
        </>
      )}
    </div>
  )
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'shrink-0 min-h-10 px-3 rounded-[var(--radius-full)] text-sm font-medium border transition-colors focus-ring cursor-pointer',
        active
          ? 'bg-primary text-primary-fg border-primary'
          : 'bg-surface text-fg-muted border-border-default hover:border-border-strong hover:text-fg'
      )}
    >
      {label}
    </button>
  )
}
