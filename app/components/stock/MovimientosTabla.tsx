import Link from 'next/link'
import type { MovimientoStockItem } from '@/lib/stock/queries'
import { formatDateTime, formatSignedDelta } from '@/lib/format'

interface MovimientosTablaProps {
  items: MovimientoStockItem[]
  mostrarVariante?: boolean
}

const tipoBadge: Record<string, string> = {
  entrada: 'bg-primary-soft text-fg-brand border border-primary-border',
  salida: 'bg-danger-soft text-danger-soft-fg border border-danger-border',
  ajuste: 'bg-fg/5 text-fg',
  devolucion: 'bg-warning-soft text-warning-soft-fg border border-warning-border',
  inicial: 'bg-surface-sunken text-fg-muted',
}

const tipoLabel: Record<string, string> = {
  entrada: 'Entrada',
  salida: 'Salida',
  ajuste: 'Ajuste',
  devolucion: 'Devolución',
  inicial: 'Inicial',
}

export function MovimientosTabla({
  items,
  mostrarVariante = true,
}: MovimientosTablaProps) {
  if (items.length === 0) {
    return (
      <div className="bg-surface border border-dashed border-border-default rounded-[var(--radius-lg)] p-8 text-center text-sm text-fg-muted">
        Sin movimientos registrados.
      </div>
    )
  }

  return (
    <>
      {/* Vista móvil — sm:hidden */}
      <div className="sm:hidden space-y-2">
        {items.map((m) => {
          const cls = tipoBadge[m.tipo] ?? 'bg-surface-sunken text-fg'
          const cantCls =
            m.cantidad > 0 ? 'text-success-soft-fg font-bold' : m.cantidad < 0 ? 'text-danger-soft-fg font-bold' : 'text-fg'
          return (
            <div key={m.id} className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
                  {tipoLabel[m.tipo] ?? m.tipo}
                </span>
                <span className={`text-sm tabular-nums ${cantCls}`}>
                  {formatSignedDelta(m.cantidad)}
                </span>
              </div>
              {mostrarVariante && (
                <p className="text-[13px] font-medium text-fg truncate">
                  <Link href={`/stock/${m.variante_id}`} className="text-fg-brand hover:underline">
                    {m.variante_nombre}
                  </Link>
                  {m.variante_label && (
                    <span className="text-fg-muted font-normal"> · {m.variante_label}</span>
                  )}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-fg-subtle mt-1">
                <span>{formatDateTime(m.created_at)}</span>
                <span className="tabular-nums">
                  {m.stock_anterior} → <strong className="text-fg">{m.stock_posterior}</strong>
                </span>
              </div>
              {m.motivo && (
                <p className="text-[13px] text-fg-muted mt-1 truncate">{m.motivo}</p>
              )}
              {m.venta_id && m.numero_ticket != null && (
                <div className="text-xs mt-1">
                  <Link href={`/ventas/${m.venta_id}`} className="text-fg-brand hover:underline">
                    Ticket #{m.numero_ticket}
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Vista desktop — hidden sm:block */}
      <div className="hidden sm:block bg-surface rounded-[var(--radius-lg)] border border-border-subtle overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-sunken">
            <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-fg-subtle">
              <th className="px-3 py-2 text-left">Fecha</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              {mostrarVariante && (
                <th className="px-3 py-2 text-left">Variante</th>
              )}
              <th className="px-3 py-2 text-right">Cantidad</th>
              <th className="px-3 py-2 text-right">Stock anterior</th>
              <th className="px-3 py-2 text-right">Stock posterior</th>
              <th className="px-3 py-2 text-left">Motivo / Referencia</th>
              <th className="px-3 py-2 text-left">Usuario</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {items.map((m) => {
              const cls = tipoBadge[m.tipo] ?? 'bg-surface-sunken text-fg'
              const cantCls =
                m.cantidad > 0 ? 'text-success-soft-fg' : m.cantidad < 0 ? 'text-danger-soft-fg' : ''
              return (
                <tr key={m.id} className="hover:bg-surface-sunken align-top">
                  <td className="px-3 py-2 text-fg whitespace-nowrap">
                    {formatDateTime(m.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
                    >
                      {tipoLabel[m.tipo] ?? m.tipo}
                    </span>
                  </td>
                  {mostrarVariante && (
                    <td className="px-3 py-2">
                      <Link
                        href={`/stock/${m.variante_id}`}
                        className="text-fg-brand hover:underline font-medium"
                      >
                        {m.variante_nombre}
                      </Link>
                      {m.variante_label && (
                        <div className="text-xs text-fg-muted">{m.variante_label}</div>
                      )}
                      {m.codigo_barras && (
                        <div className="font-mono text-xs text-fg-subtle">
                          {m.codigo_barras}
                        </div>
                      )}
                    </td>
                  )}
                  <td className={`px-3 py-2 text-right font-semibold tabular-nums ${cantCls}`}>
                    {formatSignedDelta(m.cantidad)}
                  </td>
                  <td className="px-3 py-2 text-right text-fg-muted tabular-nums">
                    {m.stock_anterior}
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-fg tabular-nums">
                    {m.stock_posterior}
                  </td>
                  <td className="px-3 py-2 text-fg">
                    {m.motivo ?? '—'}
                    {m.venta_id && m.numero_ticket != null && (
                      <div className="text-xs">
                        <Link
                          href={`/ventas/${m.venta_id}`}
                          className="text-fg-brand hover:underline"
                        >
                          Ticket #{m.numero_ticket}
                        </Link>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-fg">{m.usuario_nombre ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
