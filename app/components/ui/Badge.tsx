import { type ReactNode } from 'react'
import { cn } from './cn'

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'brand'

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-success-soft text-success-soft-fg border-success-border',
  warning: 'bg-warning-soft text-warning-soft-fg border-warning-border',
  danger: 'bg-danger-soft text-danger-soft-fg border-danger-border',
  info: 'bg-info-soft text-info-soft-fg border-info-border',
  neutral: 'bg-surface-sunken text-fg-muted border-border-default',
  brand: 'bg-primary-soft text-primary-soft-fg border-primary-border',
}

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--radius-full)] border px-2 py-0.5 text-xs font-medium leading-tight',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

/** Mapea estado de venta/operación a variante semántica */
export function estadoVentaBadge(estado: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    completada: 'success',
    anulada: 'danger',
    cancelada: 'danger',
    pendiente: 'warning',
    parcial: 'info',
  }
  return map[estado] ?? 'neutral'
}
