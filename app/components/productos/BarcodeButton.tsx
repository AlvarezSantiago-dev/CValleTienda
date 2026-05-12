'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { generarCodigoBarrasUnico } from '@/app/actions/productos'

interface BarcodeButtonProps {
  onGenerated: (codigo: string) => void
}

export function BarcodeButton({ onGenerated }: BarcodeButtonProps) {
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

  return (
    <div className="inline-flex flex-col items-end">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? 'Generando...' : 'Generar EAN-13'}
      </Button>
      {error && <span className="text-xs text-red-600 mt-1">{error}</span>}
    </div>
  )
}
