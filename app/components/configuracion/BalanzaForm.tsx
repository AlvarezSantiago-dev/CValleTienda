'use client'

import { useState, useTransition } from 'react'
import { actualizarConfigBalanza } from '@/app/actions/configuracion'
import type { ConfiguracionTienda } from '@/lib/configuracion/queries'

interface BalanzaFormProps {
  initial: ConfiguracionTienda | null
}

export function BalanzaForm({ initial }: BalanzaFormProps) {
  const [isPending, startTransition] = useTransition()
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [formato, setFormato] = useState<'precio' | 'peso' | null>(
    (initial?.balanza_formato as 'precio' | 'peso' | null) ?? null
  )

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMensaje(null)
    startTransition(async () => {
      const res = await actualizarConfigBalanza(formato)
      setMensaje(res.ok
        ? { tipo: 'ok', texto: 'Configuración de balanza guardada' }
        : { tipo: 'error', texto: res.error ?? 'Error al guardar' }
      )
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mensaje && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            mensaje.tipo === 'ok'
              ? 'bg-lime-50 text-lime-800 border border-lime-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
          role="status"
        >
          {mensaje.texto}
        </div>
      )}

      <p className="text-[13px] text-gray-400">
        Si usás una balanza que genera etiquetas con código de barras EAN-13 (prefijo 2),
        indicá si el valor embebido representa el precio o el peso del producto.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setFormato(null)}
          className={`relative rounded-xl border-2 p-4 text-left transition-colors ${
            formato === null
              ? 'border-lime-500 bg-lime-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          {formato === null && (
            <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-lime-500 flex items-center justify-center text-white text-xs">✓</span>
          )}
          <p className="font-semibold text-sm text-[#0A0A0A] mb-1">Sin balanza</p>
          <p className="text-xs text-gray-500">No usás balanza o manejás los precios manualmente.</p>
        </button>

        <button
          type="button"
          onClick={() => setFormato('precio')}
          className={`relative rounded-xl border-2 p-4 text-left transition-colors ${
            formato === 'precio'
              ? 'border-lime-500 bg-lime-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          {formato === 'precio' && (
            <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-lime-500 flex items-center justify-center text-white text-xs">✓</span>
          )}
          <p className="font-semibold text-sm text-[#0A0A0A] mb-1">Precio embebido</p>
          <p className="text-xs text-gray-500">El código trae el precio final (÷100). Ej: 01250 → $12.50</p>
        </button>

        <button
          type="button"
          onClick={() => setFormato('peso')}
          className={`relative rounded-xl border-2 p-4 text-left transition-colors ${
            formato === 'peso'
              ? 'border-lime-500 bg-lime-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          {formato === 'peso' && (
            <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-lime-500 flex items-center justify-center text-white text-xs">✓</span>
          )}
          <p className="font-semibold text-sm text-[#0A0A0A] mb-1">Peso embebido</p>
          <p className="text-xs text-gray-500">El código trae los gramos (÷1000 = kg). Ej: 01350 → 1.350 kg</p>
        </button>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 px-4 text-sm font-semibold bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full disabled:opacity-60 transition-colors"
        >
          {isPending ? 'Guardando...' : 'Guardar balanza'}
        </button>
      </div>
    </form>
  )
}
