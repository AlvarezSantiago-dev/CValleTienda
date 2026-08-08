import { type HTMLAttributes } from 'react'
import { cn } from './cn'

type CardVariant = 'default' | 'subtle' | 'highlighted' | 'ghost'

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-surface border border-border-subtle shadow-xs',
  subtle: 'bg-surface-sunken border border-border-subtle',
  highlighted: 'bg-primary-soft border border-primary-border',
  ghost: 'bg-transparent border border-dashed border-border-default',
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-6',
} as const

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: keyof typeof paddingClasses
  hoverable?: boolean
}

export function Card({
  variant = 'default',
  padding = 'md',
  hoverable = false,
  className = '',
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] transition-colors duration-(--duration-fast)',
        variantClasses[variant],
        paddingClasses[padding],
        hoverable && 'hover:border-border-default hover:shadow-sm cursor-pointer',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4 flex items-center justify-between gap-2', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardTitle({ className = '', children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-heading font-semibold text-fg', className)} {...rest}>
      {children}
    </h3>
  )
}

export function CardDescription({
  className = '',
  children,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs text-fg-muted mt-0.5', className)} {...rest}>
      {children}
    </p>
  )
}
