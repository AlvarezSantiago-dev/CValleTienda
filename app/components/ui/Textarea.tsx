import { forwardRef, type TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

const baseClasses =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-400 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className = '', id, rows = 3, ...rest },
  ref
) {
  const borderClass = error ? 'border-red-400 focus:ring-red-400/40 focus:border-red-400' : 'border-gray-200'
  const inputId = id ?? rest.name

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-gray-600 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        className={`${baseClasses} ${borderClass} ${className}`}
        {...rest}
      />
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-gray-400">{hint}</p>
      ) : null}
    </div>
  )
})
