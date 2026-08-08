'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { ROUTE_LABELS } from './nav-config'
import { usePageTitle } from './PageContext'
import { cn } from '@/components/ui/cn'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface BreadcrumbsProps {
  className?: string
}

export function Breadcrumbs({ className = '' }: BreadcrumbsProps) {
  const pathname = usePathname()
  const { title } = usePageTitle()

  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null

  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/')
    const isLast = i === segments.length - 1
    let label = ROUTE_LABELS[seg] ?? seg

    if (UUID_RE.test(seg)) {
      label = isLast && title ? title : 'Detalle'
    }

    return { href, label, isLast }
  })

  // Single-level routes: breadcrumbs add little value — still show for consistency on depth ≥1
  if (crumbs.length === 1 && !title) {
    return (
      <p className={cn('text-sm text-fg-muted truncate', className)}>
        {crumbs[0].label}
      </p>
    )
  }

  return (
    <nav aria-label="Breadcrumb" className={cn('min-w-0', className)}>
      <ol className="flex items-center gap-1 text-sm text-fg-muted overflow-hidden">
        {crumbs.map((c, i) => (
          <li key={c.href} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight size={14} className="shrink-0 text-fg-subtle" aria-hidden />}
            {c.isLast ? (
              <span className="truncate font-medium text-fg" aria-current="page">
                {c.label}
              </span>
            ) : (
              <Link
                href={c.href}
                className="truncate hover:text-fg transition-colors focus-ring rounded-sm"
              >
                {c.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
