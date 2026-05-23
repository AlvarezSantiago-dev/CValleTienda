import { type HTMLAttributes } from 'react'

type CardVariant = 'default' | 'subtle' | 'highlighted' | 'ghost'

const variantClasses: Record<CardVariant, string> = {
  default:     'bg-white border border-gray-100',
  subtle:      'bg-gray-50 border border-gray-100',
  highlighted: 'bg-lime-50 border border-lime-200',
  ghost:       'bg-transparent border border-dashed border-gray-200',
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
      className={`rounded-xl transition-colors ${variantClasses[variant]} ${paddingClasses[padding]} ${
        hoverable ? 'hover:border-gray-200 hover:shadow-sm cursor-pointer' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`mb-4 flex items-center justify-between gap-2 ${className}`} {...rest}>
      {children}
    </div>
  )
}

export function CardTitle({ className = '', children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-[15px] font-semibold text-gray-900 ${className}`} {...rest}>
      {children}
    </h3>
  )
}

export function CardDescription({ className = '', children, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs text-gray-400 mt-0.5 ${className}`} {...rest}>
      {children}
    </p>
  )
}
