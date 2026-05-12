'use client'

import { useState } from 'react'

const RUBROS = [
  { value: 'ropa',       label: 'Tienda de Ropa',   emoji: '👗' },
  { value: 'ferreteria', label: 'Ferretería',        emoji: '🔧' },
  { value: 'corralon',   label: 'Corralón',          emoji: '🏗️' },
  { value: 'despensa',   label: 'Despensa / Kiosco', emoji: '🛒' },
  { value: 'libreria',   label: 'Librería',          emoji: '📚' },
  { value: 'carniceria', label: 'Carnicería',        emoji: '🥩' },
  { value: 'farmacia',   label: 'Farmacia',          emoji: '💊' },
  { value: 'verduleria', label: 'Verdulería',        emoji: '🥦' },
  { value: 'generico',   label: 'Otro rubro',        emoji: '🏪' },
] as const

type Rubro = (typeof RUBROS)[number]['value']

export function RubroSelector() {
  const [selected, setSelected] = useState<Rubro | null>(null)

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Tipo de negocio <span className="text-red-500">*</span>
      </label>
      <div className="grid grid-cols-3 gap-2">
        {RUBROS.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setSelected(r.value)}
            className={[
              'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition',
              selected === r.value
                ? 'border-lime-500 bg-lime-50 text-lime-700 font-medium'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
            ].join(' ')}
          >
            <span className="text-base leading-none">{r.emoji}</span>
            <span>{r.label}</span>
          </button>
        ))}
      </div>
      {/* Input oculto que envía el valor al server action */}
      <input type="hidden" name="rubro" value={selected ?? ''} />
      {!selected && (
        <p className="mt-1.5 text-xs text-gray-400">Seleccioná el tipo de negocio para continuar</p>
      )}
    </div>
  )
}
