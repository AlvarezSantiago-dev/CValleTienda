import { forwardRef, type SelectHTMLAttributes, type ReactNode } from 'react'
import { cn } from './cn'
import {
  fieldBorderError,
  fieldBorderOk,
  fieldControl,
  fieldError,
  fieldHint,
  fieldLabel,
} from './fieldStyles'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  children: ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className = '', id, children, ...rest },
  ref
) {
  const selectId = id ?? rest.name

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className={fieldLabel}>
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
        className={cn(fieldControl, error ? fieldBorderError : fieldBorderOk, className)}
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <p id={`${selectId}-error`} className={fieldError} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${selectId}-hint`} className={fieldHint}>
          {hint}
        </p>
      ) : null}
    </div>
  )
})
