'use client'

import type { EjeColor, EjeTalla } from './CargaExpressRopa'

interface MatrizStockSparsaProps {
  colores: EjeColor[]
  tallas: EjeTalla[]
  stock: Record<string, number>
  onChange: (colorKey: string, tallaKey: string, qty: number) => void
}

function key(colorKey: string, tallaKey: string) {
  return `${colorKey}__${tallaKey}`
}

export function MatrizStockSparsa({ colores, tallas, stock, onChange }: MatrizStockSparsaProps) {
  if (colores.length === 0 || tallas.length === 0) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-dashed border-border-default bg-surface-sunken/50 p-6 text-center">
        <h2 className="text-sm font-semibold text-fg uppercase tracking-wide mb-2">3. Stock por talle × color</h2>
        <p className="text-sm text-fg-muted">
          Seleccioná al menos un color y un talle para armar la matriz de stock.
        </p>
      </section>
    )
  }

  const totalFila = (colorKey: string) =>
    tallas.reduce((acc, t) => acc + (stock[key(colorKey, t.key)] ?? 0), 0)
  const totalCol = (tallaKey: string) =>
    colores.reduce((acc, c) => acc + (stock[key(c.key, tallaKey)] ?? 0), 0)
  const total = colores.reduce((acc, c) => acc + totalFila(c.key), 0)

  return (
    <section className="rounded-[var(--radius-lg)] border border-border-default bg-surface p-4 md:p-5 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-fg uppercase tracking-wide">3. Stock por talle × color</h2>
        <p className="text-xs text-fg-muted mt-1">
          Solo las celdas con cantidad &gt; 0 se crean como variantes. Vacío = no existe ese SKU.
        </p>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full min-w-[320px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-left p-2 text-xs font-medium text-fg-subtle sticky left-0 bg-surface">
                Color
              </th>
              {tallas.map((t) => (
                <th key={t.key} className="p-2 text-xs font-medium text-fg-subtle text-center min-w-[4.5rem]">
                  {t.nombre}
                </th>
              ))}
              <th className="p-2 text-xs font-medium text-fg-subtle text-center">Total</th>
            </tr>
          </thead>
          <tbody>
            {colores.map((c) => (
              <tr key={c.key} className="border-t border-border-subtle">
                <td className="p-2 sticky left-0 bg-surface">
                  <span className="inline-flex items-center gap-1.5 font-medium text-fg">
                    {c.hex && (
                      <span
                        className="w-3 h-3 rounded-full border border-border-subtle shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                    )}
                    {c.nombre}
                  </span>
                </td>
                {tallas.map((t) => {
                  const k = key(c.key, t.key)
                  const val = stock[k]
                  return (
                    <td key={t.key} className="p-1.5 text-center">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        aria-label={`${c.nombre} ${t.nombre}`}
                        value={val === undefined ? '' : val}
                        placeholder="—"
                        onChange={(e) => {
                          const n = e.target.value === '' ? 0 : Number(e.target.value)
                          onChange(c.key, t.key, Number.isFinite(n) ? n : 0)
                        }}
                        className="w-full max-w-[4.5rem] mx-auto h-9 text-center rounded-[var(--radius-md)] border border-border-default bg-surface text-fg text-sm focus-ring"
                      />
                    </td>
                  )
                })}
                <td className="p-2 text-center text-fg-muted font-medium tabular-nums">
                  {totalFila(c.key) || '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border-default">
              <td className="p-2 text-xs font-medium text-fg-subtle sticky left-0 bg-surface">Total</td>
              {tallas.map((t) => (
                <td key={t.key} className="p-2 text-center text-fg-muted font-medium tabular-nums text-xs">
                  {totalCol(t.key) || '—'}
                </td>
              ))}
              <td className="p-2 text-center font-semibold text-fg tabular-nums">{total}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}
