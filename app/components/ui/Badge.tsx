import { type ReactNode } from 'react'

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'brand'

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50  text-amber-700  border-amber-200',
  danger:  'bg-red-50    text-red-700    border-red-200',
  info:    'bg-blue-50   text-blue-700   border-blue-200',
  neutral: 'bg-gray-100  text-gray-600   border-gray-200',
  brand:   'bg-lime-50   text-lime-700   border-lime-200',
}

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

export function Badge({ children, variant = 'neutral', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium leading-tight ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  )
}

/** Mapea estado de venta/operación a variante semántica */
export function estadoVentaBadge(estado: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    completada: 'success',
    cancelada:  'danger',
    pendiente:  'warning',
    parcial:    'info',
  }
  return map[estado] ?? 'neutral'
}
