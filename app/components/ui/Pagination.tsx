import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from './cn'

interface PaginationProps {
  page: number
  pageSize: number
  total: number
  /** URL base sin search params (ej: '/productos') */
  basePath: string
  /** Search params actuales para preservar (ej: { q: 'remera' }) */
  searchParams?: Record<string, string | undefined>
}

function buildHref(basePath: string, page: number, sp?: Record<string, string | undefined>) {
  const params = new URLSearchParams()
  if (sp) {
    for (const [k, v] of Object.entries(sp)) {
      if (v && k !== 'page') params.set(k, v)
    }
  }
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

export function Pagination({ page, pageSize, total, basePath, searchParams }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  const prevPage = Math.max(1, page - 1)
  const nextPage = Math.min(totalPages, page + 1)
  const isFirst = page <= 1
  const isLast = page >= totalPages

  const linkBase = cn(
    'inline-flex items-center justify-center gap-1 h-control-lg md:h-control-md px-3',
    'rounded-[var(--radius-md)] border border-border-strong bg-surface text-sm font-medium text-fg-secondary',
    'hover:bg-surface-hover transition-colors duration-(--duration-fast) focus-ring'
  )
  const disabled = 'opacity-50 pointer-events-none'

  return (
    <nav
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-6"
      aria-label="Paginación"
    >
      <p className="text-sm text-fg-muted order-2 sm:order-1">
        Página <span className="font-medium text-fg">{page}</span> de{' '}
        <span className="font-medium text-fg">{totalPages}</span>
        <span className="hidden sm:inline"> · {total} resultados</span>
      </p>
      <div className="flex gap-2 order-1 sm:order-2">
        <Link
          href={buildHref(basePath, prevPage, searchParams)}
          className={cn(linkBase, 'flex-1 sm:flex-none', isFirst && disabled)}
          aria-disabled={isFirst}
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} aria-hidden />
          <span>Anterior</span>
        </Link>
        <Link
          href={buildHref(basePath, nextPage, searchParams)}
          className={cn(linkBase, 'flex-1 sm:flex-none', isLast && disabled)}
          aria-disabled={isLast}
          aria-label="Página siguiente"
        >
          <span>Siguiente</span>
          <ChevronRight size={16} aria-hidden />
        </Link>
      </div>
    </nav>
  )
}
