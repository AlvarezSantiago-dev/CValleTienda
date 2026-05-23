import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

const baseClasses =
  'w-full h-9 rounded-lg border bg-white px-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-lime-500/40 focus:border-lime-400 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed'

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className = '', id, ...rest },
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
      <input
        ref={ref}
        id={inputId}
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
