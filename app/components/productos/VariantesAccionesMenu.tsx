'use client'

import { useState, useRef, useEffect } from 'react'
import { BotonImprimirEtiquetas } from './BotonImprimirEtiquetas'

interface VariantesAccionesMenuProps {
  varianteId: string
  stockActual: number
  disabled?: boolean
}

export function VariantesAccionesMenu({
  varianteId,
  stockActual,
  disabled = false,
}: VariantesAccionesMenuProps) {
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!abierto) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [abierto])

  if (disabled) return null

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-lg leading-none"
        aria-label="Más acciones"
      >
        ⋮
      </button>
      {abierto && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-[10rem] rounded-lg border border-gray-200 bg-white shadow-lg py-1">
          <div className="px-2 py-1">
            <BotonImprimirEtiquetas varianteId={varianteId} stockActual={stockActual} />
          </div>
        </div>
      )}
    </div>
  )
}
