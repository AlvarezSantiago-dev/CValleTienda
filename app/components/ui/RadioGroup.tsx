'use client'

import { useId, type ReactNode } from 'react'
import { cn } from './cn'

export interface RadioOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface RadioGroupProps {
  name: string
  value: string
  onChange: (value: string) => void
  options: RadioOption[]
  label?: string
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

export function RadioGroup({
  name,
  value,
  onChange,
  options,
  label,
  orientation = 'vertical',
  className = '',
}: RadioGroupProps) {
  const groupId = useId()

  return (
    <fieldset className={cn('min-w-0', className)}>
      {label && (
        <legend className="text-xs font-medium text-fg-muted mb-2">{label}</legend>
      )}
      <div
        className={cn(
          'flex gap-2',
          orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap'
        )}
        role="radiogroup"
        aria-labelledby={label ? groupId : undefined}
      >
        {label && (
          <span id={groupId} className="sr-only">
            {label}
          </span>
        )}
        {options.map((opt) => {
          const checked = value === opt.value
          return (
            <label
              key={opt.value}
              className={cn(
                'flex items-start gap-2.5 cursor-pointer rounded-[var(--radius-md)] border px-3 py-2.5 transition-colors duration-(--duration-fast)',
                checked
                  ? 'border-primary bg-primary-soft'
                  : 'border-border-default bg-surface hover:bg-surface-hover',
                opt.disabled && 'opacity-60 cursor-not-allowed'
              )}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={checked}
                disabled={opt.disabled}
                onChange={() => onChange(opt.value)}
                className="mt-0.5 accent-[var(--primary)] h-4 w-4 shrink-0 cursor-pointer"
              />
              <span className="min-w-0">
                <span
                  className={cn(
                    'block text-sm font-medium',
                    checked ? 'text-primary-soft-fg' : 'text-fg'
                  )}
                >
                  {opt.label}
                </span>
                {opt.description && (
                  <span className="block text-xs text-fg-muted mt-0.5">{opt.description}</span>
                )}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

/** Variante simple sin cards — radios en línea con label */
export function RadioGroupPlain({
  name,
  value,
  onChange,
  options,
  label,
  className = '',
}: Omit<RadioGroupProps, 'orientation'> & { children?: ReactNode }) {
  return (
    <fieldset className={cn('min-w-0', className)}>
      {label && <legend className="text-xs font-medium text-fg-muted mb-2">{label}</legend>}
      <div className="flex flex-col gap-2" role="radiogroup">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              'inline-flex items-center gap-2 text-sm text-fg cursor-pointer',
              opt.disabled && 'opacity-60 cursor-not-allowed'
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              disabled={opt.disabled}
              onChange={() => onChange(opt.value)}
              className="accent-[var(--primary)] h-4 w-4 cursor-pointer"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
