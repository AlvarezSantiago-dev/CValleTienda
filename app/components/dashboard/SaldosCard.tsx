import type { CuentaFondo } from '@/lib/configuracion/queries'
import { formatARS } from '@/lib/format'

interface SaldosCardProps {
  cuentas: CuentaFondo[]
}

export function SaldosCard({ cuentas }: SaldosCardProps) {
  if (cuentas.length === 0) {
    return null
  }

  return (
    <div>
      <h2 className="text-sm font-medium text-gray-700 mb-3">
        Saldos disponibles
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cuentas.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{c.nombre}</span>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: (c.color ?? '#6366f1') + '22',
                  color: c.color ?? '#6366f1',
                }}
              >
                {c.tipo.replace('_', ' ')}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatARS(c.saldo_actual)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
