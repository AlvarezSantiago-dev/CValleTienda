import { KpiCard } from '@/components/dashboard/KpiCard'
import { formatARSKpi, formatARSTooltip } from '@/lib/reportes/format-kpi'

export interface KpiItem {
  label: string
  valor?: string
  valorCompleto?: string
  valorNumero?: number
  delta?: number | null
  sub?: string
  destacar?: boolean
}

interface ReportesKpiStripProps {
  items: KpiItem[]
}

export function ReportesKpiStrip({ items }: ReportesKpiStripProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 min-w-0">
      {items.map((item) => {
        const valor =
          item.valorNumero != null
            ? formatARSKpi(item.valorNumero)
            : (item.valor ?? '—')
        const valorCompleto =
          item.valorCompleto ??
          (item.valorNumero != null ? formatARSTooltip(item.valorNumero) : item.valor)

        return (
          <KpiCard
            key={item.label}
            label={item.label}
            valor={valor}
            valorCompleto={valorCompleto}
            delta={item.delta}
            sub={item.sub}
            destacar={item.destacar}
          />
        )
      })}
    </div>
  )
}
