'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import {
  caretFromUnits,
  caretUnitsBefore,
  formatARSInput,
  formatMoneyTypingARS,
  parseARSInput,
  sanitizeMoneyTyping,
} from '@/lib/format-moneda'
import { cn } from './cn'

interface InputMonedaARSProps {
  value: number
  onChange: (n: number) => void
  className?: string
  id?: string
  disabled?: boolean
  placeholder?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  'data-pago-monto'?: string
  size?: 'default' | 'large' | 'xl'
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
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingCaret = useRef<number | null>(null)

  const display = focused ? (draft ?? formatARSInput(value)) : formatARSInput(value)
  const sizeClass =
    size === 'xl'
      ? 'h-16 w-full text-2xl sm:text-4xl'
      : size === 'large'
        ? 'h-control-xl text-lg'
        : 'h-control-lg md:h-control-md text-base md:text-sm'

  useLayoutEffect(() => {
    const el = inputRef.current
    const pos = pendingCaret.current
    if (el == null || pos == null) return
    pendingCaret.current = null
    el.setSelectionRange(pos, pos)
  }, [draft])

  return (
    <div
      className={cn(
        'flex items-center border border-border-strong rounded-[var(--radius-md)] bg-surface',
        'focus-within:outline-2 focus-within:outline-offset-0 focus-within:outline-[var(--border-focus)]',
        'overflow-hidden transition-colors duration-(--duration-fast)',
        sizeClass,
        disabled && 'opacity-60 cursor-not-allowed bg-surface-sunken',
        className
      )}
    >
      <span className={`${size === 'xl' ? 'pl-3' : 'pl-2.5'} text-fg-subtle shrink-0 select-none`}>$</span>
      <input
        ref={inputRef}
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
          const el = e.target
          const caret = el.selectionStart ?? el.value.length
          const units = caretUnitsBefore(el.value, caret)
          const formatted = formatMoneyTypingARS(sanitizeMoneyTyping(el.value))
          pendingCaret.current = caretFromUnits(formatted, units)
          setDraft(formatted)
          onChange(parseARSInput(formatted))
        }}
        onKeyDown={onKeyDown}
        className="flex-1 min-w-0 h-full px-2 text-right font-mono tabular-nums border-0 focus:ring-0 focus:outline-none bg-transparent text-fg placeholder:text-fg-subtle"
      />
    </div>
  )
}
