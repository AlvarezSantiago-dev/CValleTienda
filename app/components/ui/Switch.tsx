'use client'

import { forwardRef, useId, type ButtonHTMLAttributes } from 'react'
import { cn } from './cn'

interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onChange, label, description, className = '', disabled, id, ...rest },
  ref
) {
  const autoId = useId()
  const switchId = id ?? autoId

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <button
        ref={ref}
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-(--duration-fast) cursor-pointer focus-ring',
          checked ? 'bg-primary border-primary' : 'bg-surface-sunken border-border-strong',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
        {...rest}
      >
        <span
          aria-hidden
          className={cn(
            'inline-block h-4 w-4 rounded-full bg-surface shadow-xs transition-transform duration-(--duration-fast)',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
      {(label || description) && (
        <div className="min-w-0">
          {label && (
            <label htmlFor={switchId} className="text-sm font-medium text-fg cursor-pointer">
              {label}
            </label>
          )}
          {description && <p className="text-xs text-fg-muted mt-0.5">{description}</p>}
        </div>
      )}
    </div>
  )
})
