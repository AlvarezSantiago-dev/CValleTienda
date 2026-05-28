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
          className={buttonClassName ?? "text-xs text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 mt-1"}
        >
          <span className="text-sm leading-none font-bold">+</span> {label}
        </button>
      )}
      {open && (
        <div className="flex flex-wrap items-center gap-2 mt-1.5 p-2.5 bg-indigo-50 rounded-lg border border-indigo-100">
          <input
            ref={inputRef}
            type="text"
            className="flex-1 min-w-[140px] text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
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
              className="w-8 h-8 rounded cursor-pointer border border-gray-300 p-0.5 bg-white"
              title="Elegir color"
            />
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending || !nombre.trim()}
            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
          >
            {pending ? '...' : 'Crear'}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={pending}
            className="text-xs text-gray-500 hover:text-gray-700 px-1"
          >
            ✕
          </button>
          {errorMsg && <span className="text-xs text-red-600 w-full">{errorMsg}</span>}
        </div>
      )}
    </div>
  )
}
