import Link from 'next/link'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Spinner } from './Spinner'
import { cn } from './cn'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-fg border-transparent disabled:opacity-60',
  secondary:
    'bg-surface hover:bg-surface-hover active:bg-surface-sunken text-fg border-border-default',
  outline:
    'bg-transparent hover:bg-surface-hover active:bg-surface-sunken text-fg-secondary border-border-strong',
  danger:
    'bg-danger hover:bg-danger-hover active:bg-danger-active text-fg-inverse border-transparent disabled:opacity-60',
  ghost:
    'bg-transparent hover:bg-surface-hover active:bg-surface-sunken text-fg-muted border-transparent',
}

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-control-sm px-2.5 text-xs gap-1.5',
  sm: 'h-control-sm md:h-8 px-3 text-sm gap-2 min-h-8',
  md: 'h-control-lg md:h-control-md px-4 text-sm gap-2',
  lg: 'h-control-xl px-5 text-base gap-2',
  icon: 'h-control-lg md:h-control-md w-control-lg md:w-control-md p-0',
}

export const baseClasses =
  'inline-flex items-center justify-center rounded-[var(--radius-md)] border font-medium transition-colors duration-(--duration-fast) ease-standard cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-ring'

interface BaseProps {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
  className?: string
  isLoading?: boolean
}

type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className = '', children, isLoading, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...rest}
    >
      {isLoading && <Spinner size="sm" />}
      {children}
    </button>
  )
})

interface LinkButtonProps extends BaseProps {
  href: string
  prefetch?: boolean
}

export function LinkButton({
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  prefetch,
  children,
}: LinkButtonProps) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
    >
      {children}
    </Link>
  )
}
