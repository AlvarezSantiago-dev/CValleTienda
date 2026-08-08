import Link from 'next/link'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'

interface DashboardSectionCardProps {
  title: string
  description?: string
  action?: { label: string; href: string }
  children?: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md'
  empty?: boolean
  emptyMessage?: string
}

export function DashboardSectionCard({
  title,
  description,
  action,
  children,
  className = '',
  padding = 'none',
  empty,
  emptyMessage = 'Sin datos.',
}: DashboardSectionCardProps) {
  return (
    <Card
      className={cn('overflow-hidden h-full flex flex-col', className)}
      padding="none"
    >
      <div className="px-5 py-4 border-b border-border-subtle flex items-start justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg">{title}</h2>
          {description && (
            <p className="text-xs text-fg-muted mt-0.5">{description}</p>
          )}
        </div>
        {action && (
          <Link
            href={action.href}
            className="shrink-0 text-xs font-medium text-fg-brand hover:underline focus-ring rounded-[var(--radius-sm)]"
          >
            {action.label}
          </Link>
        )}
      </div>
      <div
        className={cn(
          'flex-1 min-h-0',
          padding === 'md' && 'p-5',
          padding === 'sm' && 'p-3',
          padding === 'none' && ''
        )}
      >
        {empty ? (
          <p className="text-sm text-fg-subtle py-8 text-center px-5">{emptyMessage}</p>
        ) : (
          children
        )}
      </div>
    </Card>
  )
}
