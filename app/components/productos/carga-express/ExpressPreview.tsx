'use client'

import type { CargaExpressDraft } from '@/lib/productos/carga-express/tipos'
import { Button } from '@/components/ui/Button'

interface ExpressPreviewProps {
  draft: CargaExpressDraft
  unidades: number
  validationError: string | null
  generarBarras: boolean
  onGenerarBarrasChange: (v: boolean) => void
  pending: boolean
  onCrear: () => void
  onCrearYOtro: () => void
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(n)
}

export function ExpressPreview({
  draft,
  unidades,
  validationError,
  generarBarras,
  onGenerarBarrasChange,
  pending,
  onCrear,
  onCrearYOtro,
}: ExpressPreviewProps) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-border-default bg-surface p-4 md:p-5 space-y-4">
      <h2 className="text-sm font-semibold text-fg uppercase tracking-wide">4. Confirmar</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <p className="text-xs text-fg-subtle">Variantes</p>
          <p className="font-semibold text-fg">{draft.celdas.length}</p>
        </div>
        <div>
          <p className="text-xs text-fg-subtle">Unidades</p>
          <p className="font-semibold text-fg">{unidades}</p>
        </div>
        <div>
          <p className="text-xs text-fg-subtle">Precio venta</p>
          <p className="font-semibold text-fg">
            {draft.precioVenta > 0 ? formatARS(draft.precioVenta) : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-fg-subtle">Categoría</p>
          <p className="font-semibold text-fg">{draft.categoriaNombre ?? 'Sin categoría'}</p>
        </div>
      </div>

      {draft.celdas.length > 0 && (
        <div className="overflow-x-auto max-h-48 overflow-y-auto border border-border-subtle rounded-[var(--radius-md)]">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken sticky top-0">
              <tr>
                <th className="text-left p-2 text-xs text-fg-subtle font-medium">Color</th>
                <th className="text-left p-2 text-xs text-fg-subtle font-medium">Talle</th>
                <th className="text-right p-2 text-xs text-fg-subtle font-medium">Stock</th>
              </tr>
            </thead>
            <tbody>
              {draft.celdas.map((c, i) => (
                <tr key={i} className="border-t border-border-subtle">
                  <td className="p-2 text-fg">{c.colorNombre}</td>
                  <td className="p-2 text-fg">{c.tallaNombre}</td>
                  <td className="p-2 text-right tabular-nums font-medium">{c.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-fg cursor-pointer">
        <input
          type="checkbox"
          checked={generarBarras}
          onChange={(e) => onGenerarBarrasChange(e.target.checked)}
          className="rounded border-border-default"
        />
        Generar códigos de barras (EAN-13) automáticamente
      </label>

      {validationError && (
        <p className="text-sm text-danger" role="alert">
          {validationError}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onCrear} disabled={pending || !!validationError} isLoading={pending}>
          Crear producto
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCrearYOtro}
          disabled={pending || !!validationError}
        >
          Crear y cargar otro
        </Button>
      </div>
    </section>
  )
}
