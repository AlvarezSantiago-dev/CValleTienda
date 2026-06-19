'use client'

import { formatARS } from '@/lib/format'
import { Button } from '@/components/ui/Button'

interface PanelCobroResumenProps {
  subtotal: number
  descuento: number
  totalAPagar: number
  itemsCount: number
  onCobrar: () => void
  isCobrando: boolean
  puedeCobrar: boolean
  error: string | null
}

export function PanelCobroResumen({
  subtotal,
  descuento,
  totalAPagar,
  itemsCount,
  onCobrar,
  isCobrando,
  puedeCobrar,
  error,
}: PanelCobroResumenProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)] lg:sticky lg:top-4">
      <div className="px-5 py-4 border-b border-gray-50">
        <h2 className="text-[15px] font-semibold text-gray-900">Cobrar</h2>
        <p className="text-[12px] text-gray-500 mt-1">Modo paso a paso activo</p>
      </div>

      <div className="px-5 py-4 space-y-3">
        <div className="flex justify-between text-[13px] text-gray-600">
          <span>{itemsCount} producto{itemsCount !== 1 ? 's' : ''}</span>
          <span className="tabular-nums">{formatARS(subtotal)}</span>
        </div>
        {descuento > 0 && (
          <div className="flex justify-between text-[13px] text-amber-700">
            <span>Descuento</span>
            <span className="tabular-nums">− {formatARS(descuento)}</span>
          </div>
        )}
        <div className="bg-gray-50 rounded-xl px-4 py-4 flex flex-col items-center gap-1">
          <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
            Total a pagar
          </span>
          <span className="text-[32px] font-black text-gray-900 tabular-nums leading-none">
            {formatARS(totalAPagar)}
          </span>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-gray-50 space-y-3">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[13px] text-red-800">
            {error}
          </div>
        )}
        <Button
          type="button"
          onClick={onCobrar}
          disabled={!puedeCobrar || isCobrando}
          className="w-full !bg-[#0A0A0A] hover:!bg-gray-800 !rounded-full !h-12 !border-transparent !text-[15px] !font-bold hidden lg:flex"
        >
          {isCobrando ? 'Cobrando…' : `Cobrar ${formatARS(totalAPagar)}`}
        </Button>
        <p className="hidden lg:block text-center text-[12px] text-gray-500">
          Presioná <kbd className="font-mono text-[11px] bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">F2</kbd> para cobrar paso a paso
        </p>
      </div>
    </div>
  )
}
