'use client'

import { useState } from 'react'

interface PrintSelectionModalProps {
  numeroTicket: string
  /** Mostrar opción de vale de cambio */
  tieneVale: boolean
  diasCambio?: number
  onTicket: () => void
  onVale: () => void
  onClose: () => void
}

/**
 * Modal de selección de documentos a imprimir — aparece tras confirmar una venta.
 * NO se cierra al imprimir: el cajero imprime uno, corta, imprime otro, y cierra cuando termina.
 */
export function PrintSelectionModal({
  numeroTicket,
  tieneVale,
  diasCambio,
  onTicket,
  onVale,
  onClose,
}: PrintSelectionModalProps) {
  const [impreso, setImpreso] = useState<{ ticket: boolean; vale: boolean }>({
    ticket: false,
    vale: false,
  })

  const handleTicket = () => {
    onTicket()
    setImpreso((prev) => ({ ...prev, ticket: true }))
  }

  const handleVale = () => {
    onVale()
    setImpreso((prev) => ({ ...prev, vale: true }))
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <p className="text-[10px] uppercase tracking-[0.10em] font-semibold text-gray-400 mb-0.5">
            Imprimir
          </p>
          <h2 className="text-[17px] font-bold text-[#0A0A0A]">
            Venta {numeroTicket}
          </h2>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Enviá cada ticket por separado y cortá entre ellos.
          </p>
        </div>

        {/* Opciones */}
        <div className="p-4 space-y-2">
          <button
            type="button"
            onClick={handleTicket}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
              impreso.ticket
                ? 'border-gray-200 bg-gray-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <span className="text-xl">🧾</span>
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-[#0A0A0A]">Ticket de venta</p>
              <p className="text-[11px] text-gray-400">Comprobante de la transacción</p>
            </div>
            {impreso.ticket && (
              <span className="text-[11px] font-semibold text-lime-600 shrink-0">Enviado ✓</span>
            )}
          </button>

          {tieneVale && (
            <button
              type="button"
              onClick={handleVale}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-colors ${
                impreso.vale
                  ? 'border-amber-100 bg-amber-50/50'
                  : 'border-amber-200 hover:border-amber-300 hover:bg-amber-50'
              }`}
            >
              <span className="text-xl">📄</span>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-[#0A0A0A]">Vale de cambio</p>
                <p className="text-[11px] text-gray-400">
                  Slip con validez de {diasCambio} días para cambios
                </p>
              </div>
              {impreso.vale && (
                <span className="text-[11px] font-semibold text-lime-600 shrink-0">Enviado ✓</span>
              )}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-[13px] font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
