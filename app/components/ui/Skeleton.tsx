import { type HTMLAttributes } from 'react'

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
      ? 'rounded h-[0.875rem]'
      : 'rounded-xl'

  return (
    <div
      className={`animate-pulse bg-gray-100 ${shape} ${className}`}
      style={{ width, height, ...style }}
      aria-hidden
      {...rest}
    />
  )
}

/** Fila skeleton para tablas */
export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr className="border-b border-gray-50">
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
    <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-3">
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
