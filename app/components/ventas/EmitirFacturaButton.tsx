'use client'

import { useState, useTransition } from 'react'
import { emitirFactura } from '@/app/actions/facturacion'
import type { FacturaEmitida } from '@/lib/facturacion/tipos'

interface EmitirFacturaButtonProps {
  ventaId: string
}

export function EmitirFacturaButton({ ventaId }: EmitirFacturaButtonProps) {
  const [open, setOpen] = useState(false)
  const [cuit, setCuit] = useState('')
  const [resultado, setResultado] = useState<FacturaEmitida | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleEmitir() {
    setError(null)
    startTransition(async () => {
      const res = await emitirFactura(ventaId, cuit.trim() || null)
      if (res.ok && res.data) {
        setResultado(res.data)
        setOpen(false)
      } else {
        setError(res.error ?? 'Error al emitir la factura')
      }
    })
  }

  if (resultado) {
    return (
      <div className="flex flex-col gap-1 bg-lime-50 border border-lime-200 rounded-xl px-4 py-2.5 text-sm text-lime-800">
        <div className="flex items-center gap-2">
          <span className="text-lime-600">✓</span>
          <span>
            Factura {resultado.tipo_comprobante} N° {resultado.numero_comprobante} emitida
            {resultado.cae ? ` · CAE: ${resultado.cae}` : ''}
            {resultado.cae_vencimiento ? ` · Vence: ${resultado.cae_vencimiento}` : ''}
          </span>
        </div>
        {resultado.pdf_url && (
          <a
            href={resultado.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-6 text-xs font-medium text-lime-700 hover:text-lime-800 underline"
          >
            📄 Descargar PDF de la factura
          </a>
        )}
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center h-10 px-4 rounded-full bg-[#0A0A0A] hover:bg-gray-800 text-white text-sm font-semibold transition-colors"
      >
        Emitir Factura Electrónica
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <div>
              <h3 className="text-[15px] font-bold tracking-[-0.018em] text-[#0A0A0A]">Emitir Factura Electrónica</h3>
              <p className="text-[13px] text-gray-400 mt-0.5">
                Se emitirá ante AFIP/ARCA a través de TusFacturasAPP.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                CUIT del receptor (opcional)
              </label>
              <input
                type="text"
                value={cuit}
                onChange={(e) => setCuit(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="20123456789 — dejá vacío para Factura C"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-lime-400/60 focus:outline-none"
                maxLength={11}
              />
              <p className="text-xs text-gray-400 mt-1">
                Con CUIT se emite Factura A o B según condición IVA del receptor.
                Sin CUIT siempre es Factura C.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setOpen(false); setError(null) }}
                disabled={isPending}
                className="h-10 px-4 rounded-full border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEmitir}
                disabled={isPending}
                className="h-10 px-4 rounded-full bg-[#0A0A0A] hover:bg-gray-800 text-white text-sm font-semibold disabled:opacity-50"
              >
                {isPending ? 'Emitiendo…' : 'Emitir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
