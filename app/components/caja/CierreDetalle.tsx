import type { Cierre } from '@/lib/caja/queries'

interface CierreDetalleProps {
  cierre: Cierre
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function CierreDetalle({ cierre }: CierreDetalleProps) {
  const dif = cierre.diferencia_efectivo
  const difTone =
    dif == null
      ? 'text-gray-700'
      : dif === 0
      ? 'text-green-700'
      : dif > 0
      ? 'text-blue-700'
      : 'text-red-700'

  const totalNetoReal = cierre.detalles.length > 0
    ? cierre.detalles.reduce((acc, d) => acc + d.total_neto, 0)
    : cierre.total_neto

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-50">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
            Cerrado
          </span>
          {cierre.tipo_cierre === 'emergencia' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">
              ⚠️ Emergencia
            </span>
          )}
        </div>
        <h2 className="text-[15px] font-semibold text-gray-900">
          Cierre del {formatDateTime(cierre.fecha_cierre)}
        </h2>
      </div>

      {/* Contenido */}
      <div className="px-6 py-5 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <Cell label="Ventas" value={cierre.total_ventas_cantidad} subValue={formatARS(cierre.total_ventas_monto)} />
          <Cell
            label="Devoluciones"
            value={cierre.total_devoluciones_cantidad}
            subValue={formatARS(cierre.total_devoluciones_monto)}
          />
          <Cell label="Total neto" value={formatARS(totalNetoReal)} highlight />
          <Cell
            label="Apertura efectivo"
            value={formatARS(cierre.monto_apertura_efectivo)}
          />
        </div>

        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-gray-400 mb-3">Arqueo de efectivo</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <Cell label="Esperado" value={formatARS(cierre.efectivo_esperado)} />
            <Cell
              label="Declarado"
              value={
                cierre.efectivo_declarado != null
                  ? formatARS(cierre.efectivo_declarado)
                  : '—'
              }
            />
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <p className="text-xs text-gray-500">Diferencia</p>
              <p className={`text-[15px] font-semibold tabular-nums ${difTone}`}>
                {dif == null ? '—' : formatARS(dif)}
              </p>
              {dif != null && dif !== 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {dif > 0 ? 'Sobrante' : 'Faltante'}
                </p>
              )}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-gray-400 mb-2">Desglose por cuenta</h3>
          {cierre.detalles.length === 0 ? (
            <p className="text-[13px] text-gray-400 italic">No hubo movimientos en este turno.</p>
          ) : (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 text-left">
                    <th className="px-4 py-2.5">Cuenta</th>
                    <th className="px-4 py-2.5">Tipo</th>
                    <th className="px-4 py-2.5 text-right">Ingresos</th>
                    <th className="px-4 py-2.5 text-right">Egresos</th>
                    <th className="px-4 py-2.5 text-right">Comisiones</th>
                    <th className="px-4 py-2.5 text-right">Neto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {cierre.detalles.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-[13px] font-medium text-gray-900">{d.nombre_cuenta}</td>
                      <td className="px-4 py-2.5 text-[13px] text-gray-500">{d.tipo_cuenta}</td>
                      <td className="px-4 py-2.5 text-right text-[13px] text-green-700 tabular-nums">
                        {formatARS(d.total_ingresos)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[13px] text-red-700 tabular-nums">
                        {d.total_egresos > 0 ? `−${formatARS(d.total_egresos)}` : formatARS(0)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[13px] text-gray-500 tabular-nums">
                        {formatARS(d.comision_estimada)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[13px] font-semibold text-gray-900 tabular-nums">
                        {formatARS(d.total_neto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {cierre.observaciones && (
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <span className="text-xs font-medium text-gray-500">Observaciones:</span>{' '}
            {cierre.observaciones}
          </div>
        )}
      </div>
    </div>
  )
}

function Cell({
  label,
  value,
  subValue,
  highlight,
}: {
  label: string
  value: string | number
  subValue?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        highlight ? 'border-lime-200 bg-lime-50' : 'border-gray-200 bg-white'
      }`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`text-base font-semibold ${
          highlight ? 'text-lime-800' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
      {subValue && <p className="text-xs text-gray-500 mt-0.5">{subValue}</p>}
    </div>
  )
}
