'use client'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { TramoCantidad } from '@/lib/precios/tramos-cantidad'
import { MAX_TRAMOS } from '@/lib/precios/tramos-cantidad'

interface TramosCantidadEditorProps {
  value: TramoCantidad[]
  onChange: (next: TramoCantidad[]) => void
}

export function TramosCantidadEditor({ value, onChange }: TramosCantidadEditorProps) {
  function update(i: number, patch: Partial<TramoCantidad>) {
    onChange(value.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-fg">Descuento por cantidad</p>
      <p className="text-xs text-fg-muted">
        A partir de N unidades, X % off. Vacío = sin descuento. Gana el tramo más alto que alcance
        la línea (no se apilan).
      </p>
      {value.map((t, i) => (
        <div key={i} className="flex items-end gap-2">
          <Input
            label={i === 0 ? 'A partir de' : undefined}
            type="number"
            min={1}
            step="1"
            value={t.cantidad_desde || ''}
            onChange={(e) => update(i, { cantidad_desde: Number(e.target.value) || 0 })}
            placeholder="2"
          />
          <Input
            label={i === 0 ? '% dto.' : undefined}
            type="number"
            min={0}
            max={100}
            step="0.01"
            value={t.descuento_pct || ''}
            onChange={(e) => update(i, { descuento_pct: Number(e.target.value) || 0 })}
            placeholder="10"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 mb-0.5"
            onClick={() => onChange(value.filter((_, idx) => idx !== i))}
          >
            Quitar
          </Button>
        </div>
      ))}
      {value.length < MAX_TRAMOS && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange([...value, { cantidad_desde: 0, descuento_pct: 0 }])}
        >
          Agregar tramo
        </Button>
      )}
    </div>
  )
}
