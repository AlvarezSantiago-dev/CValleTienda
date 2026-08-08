import { cn } from './cn'

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
} as const

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={cn(
          'rounded-full object-cover bg-surface-sunken shrink-0',
          sizeClasses[size],
          className
        )}
      />
    )
  }

  return (
    <span
      aria-label={name}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-primary-soft text-primary-soft-fg font-semibold shrink-0 select-none',
        sizeClasses[size],
        className
      )}
    >
      {initials(name)}
    </span>
  )
}
