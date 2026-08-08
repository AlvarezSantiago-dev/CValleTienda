import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from './cn'
import {
  fieldBorderError,
  fieldBorderOk,
  fieldControl,
  fieldError,
  fieldHint,
  fieldLabel,
} from './fieldStyles'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className = '', id, rows = 3, ...rest },
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
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(
          fieldControl,
          'h-auto py-2.5',
          error ? fieldBorderError : fieldBorderOk,
          className
        )}
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
