import type { GananciaBrutaMes } from '@/lib/dashboard/queries'
import { formatARS } from '@/lib/format'
import { formatYmdLong } from '@/lib/datetime'
import { Card } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import type { ReactNode } from 'react'

interface Props {
  ymd: string
  data: GananciaBrutaMes
  esHoy: boolean
}

function Fila({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 min-w-0">
      <span className="text-xs text-fg-muted shrink-0">{label}</span>
      <span className="text-sm font-mono tabular-nums text-fg text-right min-w-0">
        {children}
      </span>
    </div>
  )
}

function Grupo({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-surface-sunken border border-border-subtle p-3 min-w-0">
      <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-1.5">
        {title}
      </p>
      {children}
    </div>
  )
}

export function ResumenGananciaDia({ ymd, data, esHoy }: Props) {
  const etiquetaDia = esHoy ? 'hoy' : formatYmdLong(ymd)
  const ventasNetasDia = Math.round((data.ventasBrutas - data.devoluciones) * 100) / 100
  const sinCostos = !data.tieneData

  return (
    <Card padding="md">
      <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        Resumen de {etiquetaDia}
      </p>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-fg-muted">Ingresó (bruto)</p>
          <p className="text-title font-bold font-mono tabular-nums text-fg">
            {formatARS(data.ventasBrutas)}
          </p>
          <p className="mt-0.5 text-xs text-fg-muted">
            {data.tickets === 1 ? '1 ticket' : `${data.tickets} tickets`}
            {data.tickets > 0 ? ' · suma de ventas' : ''}
          </p>
        </div>
        <div>
          <p className="text-xs text-fg-muted">Te quedó</p>
          <p
            className={cn(
              'text-title font-bold font-mono tabular-nums',
              data.resultadoNeto >= 0 ? 'text-success-soft-fg' : 'text-danger-soft-fg'
            )}
          >
            {formatARS(data.resultadoNeto)}
          </p>
          <p className="mt-0.5 text-xs text-fg-muted">
            {sinCostos
              ? 'Cargá el costo en productos para restar mercadería.'
              : data.margenPct != null
                ? `Margen ${data.margenPct}% · después de costo, comisiones y egresos`
                : 'Después de costo, comisiones y egresos'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Grupo title="Lo que ingresó">
          <Fila label="Ventas brutas">{formatARS(data.ventasBrutas)}</Fila>
          {data.creditoUsado > 0 && (
            <Fila label="Cobrado">{formatARS(data.cobrado)}</Fila>
          )}
          {data.devoluciones > 0 && (
            <Fila label="Devoluciones">
              <span className="text-danger-soft-fg">−{formatARS(data.devoluciones)}</span>
            </Fila>
          )}
          <Fila label="Ventas netas">
            <span className="font-semibold">{formatARS(ventasNetasDia)}</span>
          </Fila>
        </Grupo>

        <Grupo title="Lo que quedó">
          {data.tieneData && (
            <>
              <Fila label="Costo">{formatARS(data.costoTotal)}</Fila>
              <Fila label="Ganancia bruta">
                <span className="text-success-soft-fg font-semibold">
                  {formatARS(data.ganancia)}
                </span>
              </Fila>
            </>
          )}
          {data.totalComisiones > 0 && (
            <Fila label="Comisiones">
              <span className="text-danger-soft-fg">−{formatARS(data.totalComisiones)}</span>
            </Fila>
          )}
          {data.totalEgresos > 0 && (
            <Fila label="Egresos">
              <span className="text-danger-soft-fg">−{formatARS(data.totalEgresos)}</span>
            </Fila>
          )}
          <Fila label="Resultado neto">
            <span
              className={cn(
                'font-semibold',
                data.resultadoNeto >= 0 ? 'text-success-soft-fg' : 'text-danger-soft-fg'
              )}
            >
              {formatARS(data.resultadoNeto)}
            </span>
          </Fila>
        </Grupo>
      </div>
    </Card>
  )
}
