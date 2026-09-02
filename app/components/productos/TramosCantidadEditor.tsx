'use client'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { TipoTramo, TramoCantidad } from '@/lib/precios/tramos-cantidad'
import { MAX_TRAMOS, tipoTramo } from '@/lib/precios/tramos-cantidad'

interface TramosCantidadEditorProps {
  value: TramoCantidad[]
  onChange: (next: TramoCantidad[]) => void
  unidadLabel?: string
  titulo?: string
  ayuda?: string
}

function vacio(tipo: TipoTramo = 'pct'): TramoCantidad {
  return { cantidad_desde: 0, tipo, descuento_pct: 0, descuento_monto: null }
}

export function TramosCantidadEditor({
  value,
  onChange,
  unidadLabel = 'unidades',
  titulo = 'Descuento por cantidad',
  ayuda,
}: TramosCantidadEditorProps) {
  function update(i: number, patch: Partial<TramoCantidad>) {
    onChange(value.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-fg">{titulo}</p>
      <p className="text-xs text-fg-muted">
        {ayuda ??
          `A partir de N ${unidadLabel}: % o $ off. El $ es por cada ${unidadLabel.replace(/s$/, '')}, no el total. Gana el tramo más alto (no se apilan). Vacío = sin descuento.`}
      </p>
      {value.map((t, i) => {
        const tipo = tipoTramo(t)
        return (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <Input
              label={i === 0 ? 'A partir de' : undefined}
              type="number"
              min={1}
              step="1"
              value={t.cantidad_desde || ''}
              onChange={(e) => update(i, { cantidad_desde: Number(e.target.value) || 0 })}
              placeholder="2"
              className="w-24"
            />
            <Select
              label={i === 0 ? 'Tipo' : undefined}
              value={tipo}
              onChange={(e) => {
                const next = e.target.value as TipoTramo
                update(i, {
                  tipo: next,
                  descuento_pct: next === 'pct' ? t.descuento_pct : 0,
                  descuento_monto: next === 'monto' ? (t.descuento_monto ?? 0) : null,
                })
              }}
              className="w-[4.5rem]"
            >
              <option value="pct">%</option>
              <option value="monto">$</option>
            </Select>
            {tipo === 'monto' ? (
              <Input
                label={i === 0 ? '$ dto.' : undefined}
                type="number"
                min={0}
                step="1"
                value={t.descuento_monto || ''}
                onChange={(e) => update(i, { descuento_monto: Number(e.target.value) || 0 })}
                placeholder="500"
              />
            ) : (
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
            )}
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
        )
      })}
      {value.length < MAX_TRAMOS && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange([...value, vacio()])}
        >
          Agregar tramo
        </Button>
      )}
    </div>
  )
}
