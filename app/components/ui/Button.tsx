import Link from 'next/link'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
export type ButtonSize = 'xs' | 'sm' | 'md'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-lime-600 hover:bg-lime-700 active:bg-lime-800 text-white border-transparent disabled:bg-lime-400',
  secondary:
    'bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-800 border-gray-200',
  outline:
    'bg-transparent hover:bg-gray-50 active:bg-gray-100 text-gray-700 border-gray-300',
  danger:
    'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-transparent disabled:bg-red-400',
  ghost:
    'bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-600 border-transparent',
}

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5',
  sm: 'h-8 px-3 text-sm gap-2',
  md: 'h-9 px-4 text-sm gap-2',
}

export const baseClasses =
  'inline-flex items-center justify-center rounded-lg border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-500/60 focus-visible:ring-offset-1'

function Spinner() {
  return (
    <svg
      className="animate-spin h-3.5 w-3.5 shrink-0"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

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
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {isLoading && <Spinner />}
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
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </Link>
  )
}
