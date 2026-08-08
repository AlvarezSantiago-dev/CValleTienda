import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from './cn'
import {
  fieldBorderError,
  fieldBorderOk,
  fieldControl,
  fieldError,
  fieldHint,
  fieldLabel,
} from './fieldStyles'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className = '', id, ...rest },
  ref
) {
  const inputId = id ?? rest.name

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className={fieldLabel}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(fieldControl, error ? fieldBorderError : fieldBorderOk, className)}
        {...rest}
      />
      {error ? (
        <p id={`${inputId}-error`} className={fieldError} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className={fieldHint}>
          {hint}
        </p>
      ) : null}
    </div>
  )
})
