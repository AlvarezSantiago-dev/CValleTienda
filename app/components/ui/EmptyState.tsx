import { LinkButton } from './Button'
import type { ReactNode } from 'react'
import { cn } from './cn'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  cta?: { label: string; href: string }
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  cta,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-border-default bg-surface-sunken/60 px-6 py-14 text-center',
        className
      )}
    >
      {icon && (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] bg-surface border border-border-subtle text-fg-muted shadow-xs">
          {icon}
        </div>
      )}
      <h3 className="text-heading font-semibold text-fg">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-fg-muted max-w-xs leading-relaxed">{description}</p>
      )}
      {(cta || action) && (
        <div className="mt-5">
          {cta && <LinkButton href={cta.href} size="sm">{cta.label}</LinkButton>}
          {action}
        </div>
      )}
    </div>
  )
}
