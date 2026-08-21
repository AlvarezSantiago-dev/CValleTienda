import { formatARS } from '@/lib/format'
import { Card } from '@/components/ui/Card'

interface SaldoCcCardProps {
  saldoCc: number
  limiteCc?: number | null
}

export function SaldoCcCard({ saldoCc, limiteCc }: SaldoCcCardProps) {
  const debe = saldoCc > 0.01
  return (
    <Card variant={debe ? 'highlighted' : 'default'} padding="md">
      <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
        Cuenta corriente
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-fg">
        {debe ? `Debe ${formatARS(saldoCc)}` : 'Sin deuda'}
      </p>
      {limiteCc != null && (
        <p className="mt-1 text-xs text-fg-subtle">
          Límite {formatARS(limiteCc)}
          {debe ? ` · disponible ${formatARS(Math.max(0, limiteCc - saldoCc))}` : ''}
        </p>
      )}
    </Card>
  )
}
