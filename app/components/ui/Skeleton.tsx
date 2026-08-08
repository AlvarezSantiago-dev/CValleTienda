import { type HTMLAttributes } from 'react'
import { cn } from './cn'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle'
  width?: string | number
  height?: string | number
}

export function Skeleton({
  variant = 'rect',
  width,
  height,
  className = '',
  style,
  ...rest
}: SkeletonProps) {
  const shape =
    variant === 'circle'
      ? 'rounded-full'
      : variant === 'text'
        ? 'rounded-[var(--radius-sm)] h-[0.875rem]'
        : 'rounded-[var(--radius-lg)]'

  return (
    <div
      className={cn('animate-pulse bg-surface-sunken', shape, className)}
      style={{ width, height, ...style }}
      aria-hidden
      {...rest}
    />
  )
}

/** Fila skeleton para tablas */
export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="border-b border-border-subtle">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton variant="text" className="w-full max-w-[140px]" />
        </td>
      ))}
    </tr>
  )
}

/** Card de KPI skeleton */
export function KpiCardSkeleton() {
  return (
    <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-5 space-y-3 shadow-xs">
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-24" />
        <Skeleton variant="circle" width={28} height={28} />
      </div>
      <Skeleton height={28} className="w-36" />
      <Skeleton variant="text" className="w-20" />
    </div>
  )
}

/** Skeleton genérico de tarjeta */
export function CardSkeleton({ height = 200 }: { height?: number }) {
  return <Skeleton height={height} className="w-full" />
}
