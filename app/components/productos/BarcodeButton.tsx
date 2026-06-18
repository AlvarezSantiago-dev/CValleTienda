'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { generarCodigoBarrasUnico } from '@/app/actions/productos'

interface BarcodeButtonProps {
  onGenerated: (codigo: string) => void
  compact?: boolean
  disabled?: boolean
}

export function BarcodeButton({ onGenerated, compact = false, disabled = false }: BarcodeButtonProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const res = await generarCodigoBarrasUnico()
      if (res.ok && res.data) onGenerated(res.data.codigo)
      else setError(res.error ?? 'Error')
    })
  }

  if (compact) {
    return (
      <div className="inline-flex flex-col items-center shrink-0">
        <button
          type="button"
          onClick={handleClick}
          disabled={pending || disabled}
          title="Generar EAN-13"
          className="h-9 w-9 flex items-center justify-center rounded-lg border border-lime-300 bg-lime-50 text-lime-700 hover:bg-lime-100 disabled:opacity-40 transition-colors text-base"
        >
          {pending ? '…' : '⚡'}
        </button>
        {error && <span className="text-[10px] text-red-600 mt-0.5 max-w-[4rem] truncate">{error}</span>}
      </div>
    )
  }

  return (
    <div className="inline-flex flex-col items-end">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleClick}
        disabled={pending || disabled}
      >
        {pending ? 'Generando...' : 'Generar EAN-13'}
      </Button>
      {error && <span className="text-xs text-red-600 mt-1">{error}</span>}
    </div>
  )
}
