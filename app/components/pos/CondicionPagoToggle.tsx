'use client'

import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import type { CondicionPago } from '@/types/database'

interface CondicionPagoToggleProps {
  value: CondicionPago
  onChange: (v: CondicionPago) => void
}

export function CondicionPagoToggle({ value, onChange }: CondicionPagoToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Condición de pago"
      className="grid grid-cols-2 gap-2"
    >
      <Button
        type="button"
        role="radio"
        aria-checked={value === 'contado'}
        variant={value === 'contado' ? 'primary' : 'secondary'}
        size="sm"
        className={cn('w-full', value !== 'contado' && 'text-fg-muted')}
        onClick={() => onChange('contado')}
      >
        Contado
      </Button>
      <Button
        type="button"
        role="radio"
        aria-checked={value === 'cuenta_corriente'}
        variant={value === 'cuenta_corriente' ? 'primary' : 'secondary'}
        size="sm"
        className={cn('w-full', value !== 'cuenta_corriente' && 'text-fg-muted')}
        onClick={() => onChange('cuenta_corriente')}
      >
        A cuenta
      </Button>
    </div>
  )
}
