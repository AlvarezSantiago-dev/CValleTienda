'use client'

import type { FilaCSVParsed } from './ImportadorCSV'

interface ImportPreviewTableProps {
  filas: FilaCSVParsed[]
}

export function ImportPreviewTable({ filas }: ImportPreviewTableProps) {
  const ok = filas.filter((f) => !f.errorCliente).length
  const conError = filas.filter((f) => f.errorCliente).length

  return (
    <div>
      {/* Resumen */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <span className="text-sm text-fg-muted">
          <strong className="text-fg">{filas.length}</strong> filas en total
        </span>
        {ok > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium bg-success-soft text-success-soft-fg border border-success-border rounded-full px-2.5 py-0.5">
            ✓ {ok} correctas
          </span>
        )}
        {conError > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-medium bg-danger-soft text-danger-soft-fg border border-danger-border rounded-full px-2.5 py-0.5">
            ✗ {conError} con error
          </span>
        )}
      </div>

      {conError > 0 && (
        <p className="text-xs text-warning-soft-fg bg-warning-soft border border-warning-border rounded-[var(--radius-md)] px-3 py-2 mb-3">
          Las filas con error serán omitidas. Podés corregir el CSV y volver a subirlo.
        </p>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border-default text-sm">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr className="bg-surface-sunken text-left text-xs font-semibold text-fg-muted uppercase tracking-wide">
              <th className="px-3 py-2.5 w-10">#</th>
              <th className="px-3 py-2.5">Nombre</th>
              <th className="px-3 py-2.5">Categoría</th>
              <th className="px-3 py-2.5">Talla / Color</th>
              <th className="px-3 py-2.5 text-right">Precio venta</th>
              <th className="px-3 py-2.5 text-right">Stock</th>
              <th className="px-3 py-2.5">Cód. barras</th>
              <th className="px-3 py-2.5">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, i) => {
              const tieneError = !!fila.errorCliente
              return (
                <tr
                  key={i}
                  className={
                    tieneError
                      ? 'bg-danger-soft border-t border-red-100'
                      : 'border-t border-border-subtle hover:bg-surface-sunken'
                  }
                >
                  <td className="px-3 py-2 text-fg-subtle text-xs">{fila.filaOriginal}</td>
                  <td className="px-3 py-2 font-medium text-fg max-w-[160px] truncate">
                    {fila.nombre || <span className="text-red-400 italic">vacío</span>}
                  </td>
                  <td className="px-3 py-2 text-fg-muted">{fila.categoria || '—'}</td>
                  <td className="px-3 py-2 text-fg-muted">
                    {[fila.talla, fila.color].filter(Boolean).join(' / ') || '—'}
                  </td>
                  <td className="px-3 py-2 text-right text-fg">
                    {fila.precio_venta > 0
                      ? `$${fila.precio_venta.toLocaleString('es-AR')}`
                      : <span className="text-red-400">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-fg">{fila.stock_actual}</td>
                  <td className="px-3 py-2 text-fg-subtle text-xs font-mono">
                    {fila.codigo_barras || <span className="text-fg-subtle">auto</span>}
                  </td>
                  <td className="px-3 py-2">
                    {tieneError ? (
                      <span className="text-xs text-danger-soft-fg" title={fila.errorCliente}>
                        ✗ {fila.errorCliente}
                      </span>
                    ) : (
                      <span className="text-xs text-green-600">✓</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
