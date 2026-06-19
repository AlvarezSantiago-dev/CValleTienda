'use client'

import { useState } from 'react'
import { DescuentoEditor } from '../DescuentoEditor'
import { formatARS } from '@/lib/format'

type ModoDescuento = 'ninguno' | 'con'

interface PasoDescuentoProps {
  subtotal: number
  descuento: number
  onDescuentoChange: (v: number) => void
}

export function PasoDescuento({ subtotal, descuento, onDescuentoChange }: PasoDescuentoProps) {
  const [modo, setModo] = useState<ModoDescuento>(descuento > 0 ? 'con' : 'ninguno')

  const total = Math.max(0, Math.round((subtotal - descuento) * 100) / 100)

  function sinDescuento() {
    setModo('ninguno')
    onDescuentoChange(0)
  }

  function conDescuento() {
    setModo('con')
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900">¿Aplicar descuento?</h3>
        <p className="text-sm text-gray-500 mt-2">Subtotal: {formatARS(subtotal)}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto" role="radiogroup">
        <button
          type="button"
          role="radio"
          aria-checked={modo === 'ninguno'}
          onClick={sinDescuento}
          className={[
            'min-h-[72px] rounded-xl border-2 p-4 text-left',
            modo === 'ninguno' ? 'border-lime-500 bg-lime-50' : 'border-gray-200 hover:border-gray-300',
          ].join(' ')}
        >
          <p className="text-base font-bold text-gray-900">Sin descuento</p>
          <p className="text-sm text-gray-500">Total: {formatARS(subtotal)}</p>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={modo === 'con'}
          onClick={conDescuento}
          className={[
            'min-h-[72px] rounded-xl border-2 p-4 text-left',
            modo === 'con' ? 'border-lime-500 bg-lime-50' : 'border-gray-200 hover:border-gray-300',
          ].join(' ')}
        >
          <p className="text-base font-bold text-gray-900">Con descuento</p>
          <p className="text-sm text-gray-500">Porcentaje o monto fijo</p>
        </button>
      </div>

      {modo === 'con' && (
        <div className="max-w-lg mx-auto">
          <DescuentoEditor
            subtotal={subtotal}
            descuento={descuento}
            onDescuentoChange={onDescuentoChange}
            size="large"
            embedded
          />
        </div>
      )}

      <div className="text-center bg-gray-50 rounded-xl py-4">
        <p className="text-sm text-gray-500">Total con descuento</p>
        <p className="text-3xl font-black text-gray-900 tabular-nums mt-1">{formatARS(total)}</p>
      </div>
    </div>
  )
}
