'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { obtenerPayloadEtiquetasVariante } from '@/app/actions/impresion'
import { usePrint } from '@/lib/impresion/usePrint'
import { HojaEtiquetas } from '@/components/impresion/HojaEtiquetas'

interface BotonImprimirEtiquetasProps {
  varianteId: string
  /** Stock actual de la variante; se usa como cantidad por defecto. */
  stockActual: number
}

/**
 * Botón compacto que abre un mini-popover para elegir cantidad
 * y dispara la impresión automática de etiquetas para la variante.
 */
export function BotonImprimirEtiquetas({
  varianteId,
  stockActual,
}: BotonImprimirEtiquetasProps) {
  const [abierto, setAbierto] = useState(false)
  const [cantidad, setCantidad] = useState<number>(Math.max(1, stockActual || 1))
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { contenido, imprimir } = usePrint({
    tipo: 'etiqueta',
    onDone: () => setAbierto(false),
  })

  async function onImprimir() {
    setError(null)
    setCargando(true)
    try {
      const res = await obtenerPayloadEtiquetasVariante(varianteId, cantidad)
      if (!res.ok || !res.data) {
        setError(res.error ?? 'No se pudo generar la etiqueta')
        setCargando(false)
        return
      }
      imprimir(<HojaEtiquetas payload={res.data} />)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="text-xs text-indigo-600 hover:underline"
        title="Imprimir etiquetas"
      >
        🏷️ Etiquetas
      </button>

      {abierto && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setAbierto(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 z-50 mt-1 w-56 rounded-md border border-gray-200 bg-white p-3 shadow-lg">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Cantidad
            </label>
            <Input
              type="number"
              min={1}
              max={500}
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, Number(e.target.value || 1)))}
              autoFocus
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Sugerido: stock actual ({stockActual})
            </p>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            <div className="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setAbierto(false)}
              >
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={onImprimir} disabled={cargando}>
                {cargando ? '...' : 'Imprimir'}
              </Button>
            </div>
          </div>
        </>
      )}

      {contenido}
    </div>
  )
}
