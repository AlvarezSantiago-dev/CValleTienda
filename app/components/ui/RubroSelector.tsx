'use client'

import { useState, type ComponentType } from 'react'
import {
  Shirt,
  Wrench,
  Building2,
  ShoppingBasket,
  BookOpen,
  Beef,
  Cross,
  Carrot,
  Store,
  Truck,
} from 'lucide-react'
import { cn } from './cn'

const RUBROS: {
  value: string
  label: string
  Icon: ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>
}[] = [
  { value: 'ropa', label: 'Tienda de Ropa', Icon: Shirt },
  { value: 'ferreteria', label: 'Ferretería', Icon: Wrench },
  { value: 'corralon', label: 'Corralón', Icon: Building2 },
  { value: 'despensa', label: 'Despensa / Kiosco', Icon: ShoppingBasket },
  { value: 'libreria', label: 'Librería', Icon: BookOpen },
  { value: 'carniceria', label: 'Carnicería', Icon: Beef },
  { value: 'farmacia', label: 'Farmacia', Icon: Cross },
  { value: 'verduleria', label: 'Verdulería', Icon: Carrot },
  { value: 'generico', label: 'Otro rubro', Icon: Store },
  { value: 'distribuidora', label: 'Distribuidora', Icon: Truck },
]

type Rubro = (typeof RUBROS)[number]['value']

export function RubroSelector() {
  const [selected, setSelected] = useState<Rubro | null>(null)

  return (
    <div>
      <label className="block text-sm font-medium text-fg-secondary mb-2">
        Tipo de negocio <span className="text-danger">*</span>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de negocio">
        {RUBROS.map((r) => {
          const active = selected === r.value
          return (
            <button
              key={r.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(r.value)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-3 min-h-control-lg rounded-[var(--radius-md)] border text-sm text-left',
                'transition-colors duration-(--duration-fast) cursor-pointer focus-ring',
                active
                  ? 'border-primary bg-primary-soft text-primary-soft-fg font-medium'
                  : 'border-border-default bg-surface text-fg-secondary hover:border-border-strong hover:bg-surface-hover'
              )}
            >
              <r.Icon size={18} className="shrink-0" aria-hidden />
              <span>{r.label}</span>
            </button>
          )
        })}
      </div>
      <input type="hidden" name="rubro" value={selected ?? ''} />
      {!selected && (
        <p className="mt-1.5 text-xs text-fg-subtle">Seleccioná el tipo de negocio para continuar</p>
      )}
    </div>
  )
}
