import type { TopProductoTurno } from '@/lib/caja/types'
import { formatARS } from '@/lib/format-moneda'

interface Props {
  productos: TopProductoTurno[]
  titulo?: string
}

export function TopProductosTurno({ productos, titulo = 'Top productos del turno' }: Props) {
  if (productos.length === 0) return null

  return (
    <section>
      <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-fg-subtle mb-2">{titulo}</h3>
      <div className="rounded-[var(--radius-lg)] border border-border-subtle overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-sunken">
            <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-fg-subtle text-left">
              <th className="px-4 py-2.5">Producto</th>
              <th className="px-4 py-2.5 text-right">Cant.</th>
              <th className="px-4 py-2.5 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {productos.map((p) => (
              <tr key={p.nombre} className="hover:bg-surface-hover">
                <td className="px-4 py-2.5 text-[13px] text-fg">{p.nombre}</td>
                <td className="px-4 py-2.5 text-right text-[13px] tabular-nums">{p.cantidad}</td>
                <td className="px-4 py-2.5 text-right text-[13px] font-semibold tabular-nums">
                  {formatARS(p.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
