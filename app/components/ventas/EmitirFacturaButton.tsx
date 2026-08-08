'use client'

import { useState, useTransition } from 'react'
import { emitirFactura } from '@/app/actions/facturacion'
import type { FacturaEmitida } from '@/lib/facturacion/tipos'
import { Modal } from '@/components/ui/Modal'

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
      <div className="flex flex-col gap-1 bg-primary-soft border border-primary-border rounded-[var(--radius-lg)] px-4 py-2.5 text-sm text-primary-soft-fg">
        <div className="flex items-center gap-2">
          <span className="text-fg-brand">✓</span>
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
            className="ml-6 text-xs font-medium text-fg-brand hover:underline"
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
        className="inline-flex items-center justify-center h-10 px-4 rounded-[var(--radius-full)] bg-fg hover:bg-fg-muted text-white text-sm font-semibold transition-colors"
      >
        Emitir Factura Electrónica
      </button>

      <Modal
        open={open}
        onClose={() => { if (!isPending) { setOpen(false); setError(null) } }}
        title="Emitir Factura Electrónica"
        description="Se emitirá ante AFIP/ARCA a través de TusFacturasAPP."
        size="sm"
        mobileFullscreen={false}
        footer={
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setOpen(false); setError(null) }}
              disabled={isPending}
              className="h-10 px-4 rounded-[var(--radius-full)] border border-border-default text-sm text-fg hover:bg-surface-hover disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleEmitir}
              disabled={isPending}
              className="h-10 px-4 rounded-[var(--radius-full)] bg-fg hover:bg-fg-muted text-white text-sm font-semibold disabled:opacity-50"
            >
              {isPending ? 'Emitiendo…' : 'Emitir'}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-fg mb-1">
              CUIT del receptor (opcional)
            </label>
            <input
              type="text"
              value={cuit}
              onChange={(e) => setCuit(e.target.value.replace(/\D/g, '').slice(0, 11))}
              placeholder="20123456789 — dejá vacío para Factura C"
              className="w-full border border-border-default rounded-[var(--radius-md)] px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary/40 focus:outline-none"
              maxLength={11}
            />
            <p className="text-xs text-fg-subtle mt-1">
              Con CUIT se emite Factura A o B según condición IVA del receptor.
              Sin CUIT siempre es Factura C.
            </p>
          </div>

          {error && (
            <div className="bg-danger-soft border border-danger-border rounded-[var(--radius-md)] px-3 py-2 text-sm text-danger-soft-fg">
              {error}
            </div>
          )}
        </div>
      </Modal>
    </>
  )
}
