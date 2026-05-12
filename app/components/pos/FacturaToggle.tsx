'use client'

interface FacturaToggleProps {
  emitirFactura: boolean
  onEmitirFacturaChange: (v: boolean) => void
  cuitReceptor: string
  onCuitReceptorChange: (v: string) => void
}

/**
 * Toggle que aparece en el PanelPago cuando la facturación electrónica
 * está activa en el tenant. Permite al cajero optar por emitir una factura
 * en lugar del Ticket X, e ingresar el CUIT del receptor si lo tiene.
 */
export function FacturaToggle({
  emitirFactura,
  onEmitirFacturaChange,
  cuitReceptor,
  onCuitReceptorChange,
}: FacturaToggleProps) {
  return (
    <div className="border border-indigo-100 bg-indigo-50 rounded-lg px-3 py-2.5 space-y-2">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={emitirFactura}
          onChange={(e) => onEmitirFacturaChange(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <span className="text-sm font-medium text-indigo-900">
          Emitir factura electrónica
        </span>
      </label>

      {emitirFactura && (
        <div className="space-y-1">
          <input
            type="text"
            placeholder="CUIT del cliente (opcional)"
            value={cuitReceptor}
            onChange={(e) => onCuitReceptorChange(e.target.value)}
            maxLength={13}
            className="w-full h-8 px-2 border border-indigo-200 bg-white rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <p className="text-xs text-indigo-600">
            Sin CUIT → Consumidor Final (Fact. B o C).
            Con CUIT de RI → Factura A.
          </p>
        </div>
      )}
    </div>
  )
}
