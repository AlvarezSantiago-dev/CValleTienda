'use client'

import { useState } from 'react'
import {
  formatARSInput,
  parseARSInput,
  sanitizeMoneyTyping,
} from '@/lib/format-moneda'

interface InputMonedaARSProps {
  value: number
  onChange: (n: number) => void
  className?: string
  id?: string
  disabled?: boolean
  placeholder?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  'data-pago-monto'?: string
  size?: 'default' | 'large'
}

export function InputMonedaARS({
  value,
  onChange,
  className = '',
  id,
  disabled,
  placeholder = '0,00',
  onKeyDown,
  'data-pago-monto': dataPagoMonto,
  size = 'default',
}: InputMonedaARSProps) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)

  const display = focused ? (draft ?? formatARSInput(value)) : formatARSInput(value)

  const sizeClass = size === 'large' ? 'h-12 text-lg' : 'h-10 text-sm'

  return (
    <div
      className={[
        'flex items-center border border-gray-300 rounded-md bg-white focus-within:ring-2 focus-within:ring-lime-400/60 focus-within:border-lime-400 overflow-hidden',
        sizeClass,
        className,
      ].join(' ')}
    >
      <span className="pl-2.5 text-gray-400 shrink-0 select-none">$</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={display}
        data-pago-monto={dataPagoMonto}
        placeholder={placeholder}
        onFocus={(e) => {
          setFocused(true)
          setDraft(value > 0 ? formatARSInput(value) : '')
          e.target.select()
        }}
        onBlur={() => {
          setFocused(false)
          setDraft(null)
        }}
        onChange={(e) => {
          const sanitized = sanitizeMoneyTyping(e.target.value)
          setDraft(sanitized)
          onChange(parseARSInput(sanitized))
        }}
        onKeyDown={onKeyDown}
        className="flex-1 min-w-0 h-full px-2 text-right tabular-nums border-0 focus:ring-0 focus:outline-none bg-transparent"
      />
    </div>
  )
}
