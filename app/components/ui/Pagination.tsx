import Link from 'next/link'

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

  const linkBase =
    'inline-flex items-center justify-center h-9 px-3 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50'
  const disabled = 'opacity-50 pointer-events-none'

  return (
    <nav className="flex items-center justify-between mt-6" aria-label="Paginación">
      <p className="text-sm text-gray-500">
        Página <span className="font-medium text-gray-900">{page}</span> de{' '}
        <span className="font-medium text-gray-900">{totalPages}</span> · {total} resultados
      </p>
      <div className="flex gap-2">
        <Link
          href={buildHref(basePath, prevPage, searchParams)}
          className={`${linkBase} ${isFirst ? disabled : ''}`}
          aria-disabled={isFirst}
        >
          ← Anterior
        </Link>
        <Link
          href={buildHref(basePath, nextPage, searchParams)}
          className={`${linkBase} ${isLast ? disabled : ''}`}
          aria-disabled={isLast}
        >
          Siguiente →
        </Link>
      </div>
    </nav>
  )
}
