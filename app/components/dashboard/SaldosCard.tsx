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
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
      <div className="px-5 py-4 border-b border-gray-50">
        <h2 className="text-[14px] font-semibold text-gray-900">Saldos disponibles</h2>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cuentas.map((c) => (
          <div
            key={c.id}
            className="rounded-lg border border-gray-100 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{c.nombre}</span>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                style={{
                  backgroundColor: (c.color ?? '#65a30d') + '22',
                  color: c.color ?? '#65a30d',
                }}
              >
                {c.tipo.replace('_', ' ')}
              </span>
            </div>
            <p className="text-[17px] font-bold text-gray-900 truncate tabular-nums">
              {formatARS(c.saldo_actual)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
