'use client'

import { useMemo, useState } from 'react'
import type { PuntoSerie } from '@/lib/dashboard/queries'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { DashboardSectionCard } from './DashboardSectionCard'
import { VentasChart } from './VentasChart'

interface VentasChartSectionProps {
  serie: PuntoSerie[]
}

export function VentasChartSection({ serie }: VentasChartSectionProps) {
  const [period, setPeriod] = useState<'7' | '14'>('14')

  const sliced = useMemo(() => {
    const n = period === '7' ? 7 : 14
    return serie.slice(-n)
  }, [serie, period])

  return (
    <DashboardSectionCard
      title={`Ventas últimos ${period} días`}
      description="Solo ventas completadas (bruto, sin descontar devoluciones)."
      padding="md"
      className="lg:col-span-2"
    >
      <div className="flex justify-end mb-4">
        <SegmentedControl
          size="sm"
          ariaLabel="Período del gráfico"
          value={period}
          onChange={(v) => setPeriod(v as '7' | '14')}
          options={[
            { value: '7', label: '7 días' },
            { value: '14', label: '14 días' },
          ]}
        />
      </div>
      <VentasChart serie={sliced} />
    </DashboardSectionCard>
  )
}
