import { cn } from './cn'

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical'
  className?: string
  label?: string
}

export function Separator({
  orientation = 'horizontal',
  className = '',
  label,
}: SeparatorProps) {
  if (label && orientation === 'horizontal') {
    return (
      <div className={cn('flex items-center gap-3', className)} role="separator">
        <div className="flex-1 h-px bg-border-default" />
        <span className="text-xs text-fg-subtle shrink-0">{label}</span>
        <div className="flex-1 h-px bg-border-default" />
      </div>
    )
  }

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        orientation === 'horizontal' ? 'h-px w-full bg-border-default' : 'w-px self-stretch bg-border-default',
        className
      )}
    />
  )
}
