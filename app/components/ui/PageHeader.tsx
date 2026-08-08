import { type ReactNode } from 'react'
import { cn } from './cn'

interface PageHeaderProps {
  title: string
  description?: string
  /** Breadcrumb o nav secundaria arriba del título */
  breadcrumb?: ReactNode
  /** Acciones a la derecha (botones) */
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6',
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        {breadcrumb && <div className="mb-1">{breadcrumb}</div>}
        <h1 className="text-title font-bold text-fg truncate">{title}</h1>
        {description && (
          <p className="text-sm text-fg-muted max-w-2xl leading-relaxed">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:pt-1">{actions}</div>
      )}
    </header>
  )
}
