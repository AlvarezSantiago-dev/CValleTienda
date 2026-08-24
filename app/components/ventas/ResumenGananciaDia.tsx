import type { GananciaBrutaMes } from '@/lib/dashboard/queries'
import { formatARS } from '@/lib/format'
import { formatYmdLong } from '@/lib/datetime'
import { Card } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'

interface Props {
  ymd: string
  data: GananciaBrutaMes
  esHoy: boolean
}

function Fila({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'danger'
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-fg-muted">{label}</span>
      <span
        className={cn(
          'text-sm font-semibold font-mono tabular-nums',
          tone === 'danger' ? 'text-danger-soft-fg' : 'text-fg'
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function ResumenGananciaDia({ ymd, data, esHoy }: Props) {
  const etiquetaDia = esHoy ? 'hoy' : formatYmdLong(ymd)
  const vacio =
    !data.tieneData && data.totalComisiones === 0 && data.totalEgresos === 0

  return (
    <Card padding="md">
      <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        Ganancia neta de {etiquetaDia}
      </p>
      <p
        className={cn(
          'mt-1 text-title font-bold font-mono tabular-nums',
          data.resultadoNeto >= 0 ? 'text-success-soft-fg' : 'text-danger-soft-fg'
        )}
      >
        {formatARS(data.resultadoNeto)}
      </p>
      <p className="mt-1 text-sm text-fg-muted">
        Lo que quedó después de costo, comisiones y egresos. No es el saldo de las
        cuentas.
      </p>

      {vacio ? (
        <p className="mt-4 text-sm text-fg-muted">
          Cargá el <strong className="text-fg-secondary">precio de costo</strong> en
          los productos para ver el margen de este día.
        </p>
      ) : (
        <div className="mt-4 space-y-1.5">
          {data.tieneData && (
            <Fila label="Ganancia bruta (margen)" value={formatARS(data.ganancia)} />
          )}
          {data.totalComisiones > 0 && (
            <Fila
              label="Comisiones"
              value={`−${formatARS(data.totalComisiones)}`}
              tone="danger"
            />
          )}
          {data.totalEgresos > 0 && (
            <Fila
              label="Egresos"
              value={`−${formatARS(data.totalEgresos)}`}
              tone="danger"
            />
          )}
        </div>
      )}
    </Card>
  )
}
