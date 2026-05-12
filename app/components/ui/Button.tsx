import Link from 'next/link'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md'

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-lime-600 hover:bg-lime-700 text-white border-transparent disabled:bg-lime-400',
  secondary:
    'bg-white hover:bg-gray-50 text-gray-800 border-gray-300',
  danger:
    'bg-red-600 hover:bg-red-700 text-white border-transparent disabled:bg-red-400',
  ghost:
    'bg-transparent hover:bg-gray-100 text-gray-700 border-transparent',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-70 focus:outline-none focus:ring-2 focus:ring-lime-400/60 focus:ring-offset-1'

interface BaseProps {
  variant?: Variant
  size?: Size
  children: ReactNode
  className?: string
}

type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className = '', children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
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
