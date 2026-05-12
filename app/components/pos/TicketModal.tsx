'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { TicketImprimible, type TicketDatos } from '@/components/ventas/TicketImprimible'

interface TicketModalProps {
  ticket: TicketDatos
  onClose: () => void
}

export function TicketModal({ ticket, onClose }: TicketModalProps) {
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function imprimir() {
    window.print()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:bg-transparent print:p-0"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto print:shadow-none print:max-h-none print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 print:hidden">
          <h2 className="text-base font-semibold text-gray-900">
            Venta #{ticket.numero_ticket} registrada
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div ref={printRef} className="p-4 print:p-0">
          <TicketImprimible ticket={ticket} />
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 print:hidden">
          <Button variant="secondary" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={imprimir}>Imprimir</Button>
        </div>
      </div>
    </div>
  )
}
