'use client'

import { useRef, useState, useTransition } from 'react'

interface InlineCreateProps {
  /** Etiqueta del botón "+" — ej. "Nueva categoría", "Nueva talla" */
  label: string
  placeholder?: string
  /** Si true, muestra un color picker junto al input */
  withColor?: boolean
  /** Clase CSS para el botón trigger. Sobreescribe el estilo por defecto. */
  buttonClassName?: string
  /**
   * Transforma el texto del input en tiempo real y antes de enviar.
   * Ej: titleCase, upperCaseTrim. Si no se pasa, se usa el texto tal cual.
   */
  transform?: (texto: string) => string
  /**
   * Función asíncrona que crea el item.
   * Retorna `{ id, nombre }` en éxito, o `null` en error.
   */
  onConfirm: (nombre: string, hex?: string) => Promise<{ id: string; nombre: string } | null>
  /** Callback cuando el item fue creado exitosamente */
  onCreated: (item: { id: string; nombre: string }) => void
}

export function InlineCreate({
  label,
  placeholder,
  withColor,
  buttonClassName,
  transform,
  onConfirm,
  onCreated,
}: InlineCreateProps) {
  const [open, setOpen] = useState(false)
  const [nombre, setNombre] = useState('')
  const [hex, setHex] = useState('#3b82f6')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleOpen() {
    setOpen(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function handleReset() {
    setOpen(false)
    setNombre('')
    setHex('#3b82f6')
    setErrorMsg(null)
  }

  function handleConfirm() {
    if (!nombre.trim()) return
    setErrorMsg(null)
    startTransition(async () => {
      const nombreFinal = transform ? transform(nombre) : nombre.trim()
      const result = await onConfirm(nombreFinal, withColor ? hex : undefined)
      if (!result) {
        setErrorMsg('Error al crear')
        return
      }
      onCreated(result)
      handleReset()
    })
  }

  return (
    <div>
      {!open && (
        <button
          type="button"
          onClick={handleOpen}
          className={buttonClassName ?? "text-xs text-fg-brand hover:text-fg-brand inline-flex items-center gap-1 mt-1"}
        >
          <span className="text-sm leading-none font-bold">+</span> {label}
        </button>
      )}
      {open && (
        <div className="flex flex-wrap items-center gap-2 mt-1.5 p-2.5 bg-primary-soft rounded-[var(--radius-md)] border border-primary-border">
          <input
            ref={inputRef}
            type="text"
            className="flex-1 min-w-[140px] text-sm border border-border-strong rounded-[var(--radius-md)] px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/40 bg-surface"
            placeholder={placeholder ?? `Nombre…`}
            value={nombre}
            onChange={(e) => setNombre(transform ? transform(e.target.value) : e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleConfirm() }
              if (e.key === 'Escape') handleReset()
            }}
            disabled={pending}
          />
          {withColor && (
            <input
              type="color"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-border-strong p-0.5 bg-surface"
              title="Elegir color"
            />
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending || !nombre.trim()}
            className="text-xs bg-primary text-white px-3 py-1.5 rounded-[var(--radius-md)] hover:bg-primary disabled:opacity-50 font-medium"
          >
            {pending ? '...' : 'Crear'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={pending}
            className="text-xs text-fg-muted hover:text-fg px-1"
          >
            ✕
          </button>
          {errorMsg && <span className="text-xs text-danger-soft-fg w-full">{errorMsg}</span>}
        </div>
      )}
    </div>
  )
}
