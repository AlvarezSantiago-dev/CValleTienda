import { LinkButton } from './Button'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  cta?: { label: string; href: string }
  action?: ReactNode
}

export function EmptyState({ title, description, icon, cta, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-14 text-center">
      {icon && (
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white border border-gray-100 text-xl shadow-xs">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-gray-400 max-w-xs leading-relaxed">{description}</p>
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
