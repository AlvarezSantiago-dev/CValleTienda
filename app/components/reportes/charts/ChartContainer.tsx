import { CHART_VIEW_WIDTH } from '@/lib/reportes/chart-layout'

interface ChartContainerProps {
  children: React.ReactNode
  minWidth?: number
  className?: string
}

export function ChartContainer({ children, minWidth, className = '' }: ChartContainerProps) {
  const needsScroll = minWidth != null && minWidth > CHART_VIEW_WIDTH

  return (
    <div className={`min-w-0 w-full ${needsScroll ? 'overflow-x-auto' : ''} ${className}`}>
      <div className="w-full" style={needsScroll ? { minWidth } : undefined}>
        {children}
      </div>
    </div>
  )
}
