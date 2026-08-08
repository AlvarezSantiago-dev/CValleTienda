'use client'

import { useEffect, useState } from 'react'
import { Check, Gift, Receipt } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'

interface PrintSelectionModalProps {
  numeroTicket: string
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
  onTicket,
  onVale,
  onClose,
}: PrintSelectionModalProps) {
  const [impreso, setImpreso] = useState<{ ticket: boolean; vale: boolean }>({
    ticket: false,
    vale: false,
  })

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <Modal
      open
      onClose={onClose}
      title={`Venta ${numeroTicket}`}
      description="Imprimí lo que necesites y cerrá para seguir vendiendo."
      size="sm"
      footer={
        <Button type="button" className="w-full" size="lg" onClick={onClose}>
          Listo — nueva venta
        </Button>
      }
    >
      <p className="text-xs uppercase tracking-wider font-semibold text-fg-subtle mb-3">Imprimir</p>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => {
            onTicket()
            setImpreso((prev) => ({ ...prev, ticket: true }))
          }}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] border text-left transition-colors cursor-pointer focus-ring',
            impreso.ticket
              ? 'border-border-default bg-surface-sunken'
              : 'border-border-default hover:border-border-strong hover:bg-surface-hover'
          )}
        >
          <Receipt size={22} className="text-fg-muted shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-fg">Ticket de venta</p>
            <p className="text-xs text-fg-subtle">Comprobante de la transacción</p>
          </div>
          {impreso.ticket && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-success-soft-fg shrink-0">
              <Check size={14} aria-hidden /> Enviado
            </span>
          )}
        </button>

        {tieneVale && (
          <button
            type="button"
            onClick={() => {
              onVale()
              setImpreso((prev) => ({ ...prev, vale: true }))
            }}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3 rounded-[var(--radius-lg)] border text-left transition-colors cursor-pointer focus-ring',
              impreso.vale
                ? 'border-warning-border bg-warning-soft/50'
                : 'border-warning-border hover:bg-warning-soft'
            )}
          >
            <Gift size={22} className="text-warning-soft-fg shrink-0" aria-hidden />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-fg">Vale de cambio</p>
              <p className="text-xs text-fg-subtle">
                Sin importes, para regalo o cambio. Incluye el ticket de venta.
              </p>
            </div>
            {impreso.vale && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-success-soft-fg shrink-0">
                <Check size={14} aria-hidden /> Enviado
              </span>
            )}
          </button>
        )}
      </div>
      <p className="text-center text-xs text-fg-subtle mt-4">Enter o Esc para cerrar</p>
    </Modal>
  )
}
