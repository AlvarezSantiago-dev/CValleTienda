import { LinkButton } from './Button'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  cta?: { label: string; href: string }
}

export function EmptyState({ title, description, icon, cta }: EmptyStateProps) {
  return (
    <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
      {icon && <div className="text-4xl mb-3">{icon}</div>}
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">{description}</p>
      )}
      {cta && (
        <div className="mt-5">
          <LinkButton href={cta.href}>{cta.label}</LinkButton>
        </div>
      )}
    </div>
  )
}
