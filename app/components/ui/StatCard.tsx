import { type ReactNode } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from './cn'
import { Card } from './Card'

interface StatCardProps {
  label: string
  value: ReactNode
  /** Delta porcentual o texto (ej. "+12%") */
  delta?: string | number
  /** Si el delta es positivo/negativo (colorea automáticamente) */
  deltaTone?: 'up' | 'down' | 'neutral'
  icon?: ReactNode
  /** Sparkline u otro contenido inferior */
  footer?: ReactNode
  className?: string
  /** Monto mono tabular */
  mono?: boolean
}

export function StatCard({
  label,
  value,
  delta,
  deltaTone = 'neutral',
  icon,
  footer,
  className = '',
  mono = true,
}: StatCardProps) {
  return (
    <Card className={cn('space-y-3', className)} padding="md">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-fg-muted uppercase tracking-wide">{label}</p>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-surface-sunken text-fg-muted">
            {icon}
          </div>
        )}
      </div>
      <p
        className={cn(
          'text-title font-bold text-fg leading-none',
          mono && 'font-mono tabular-nums'
        )}
      >
        {value}
      </p>
      {(delta !== undefined || footer) && (
        <div className="flex items-center justify-between gap-2">
          {delta !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium',
                deltaTone === 'up' && 'text-success-soft-fg',
                deltaTone === 'down' && 'text-danger-soft-fg',
                deltaTone === 'neutral' && 'text-fg-muted'
              )}
            >
              {deltaTone === 'up' && <TrendingUp size={14} aria-hidden />}
              {deltaTone === 'down' && <TrendingDown size={14} aria-hidden />}
              {delta}
            </span>
          )}
          {footer}
        </div>
      )}
    </Card>
  )
}
