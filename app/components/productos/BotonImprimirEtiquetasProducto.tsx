'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { obtenerPayloadEtiquetasProducto, type VarianteResumen } from '@/app/actions/impresion'
import { usePrint } from '@/lib/impresion/usePrint'
import { HojaEtiquetas } from '@/components/impresion/HojaEtiquetas'
import type { PayloadEtiquetaProducto } from '@/lib/impresion/types'

interface FilaVariante extends VarianteResumen {
  activa: boolean
  cantidadInput: number
}

interface BotonImprimirEtiquetasProductoProps {
  productoId: string
}

export function BotonImprimirEtiquetasProducto({
  productoId,
}: BotonImprimirEtiquetasProductoProps) {
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filas, setFilas] = useState<FilaVariante[]>([])
  const [payloadBase, setPayloadBase] = useState<PayloadEtiquetaProducto | null>(null)
  const { imprimirConPayload } = usePrint({ tipo: 'etiqueta', onDone: () => setAbierto(false) })

  async function abrir() {
    if (abierto) {
      setAbierto(false)
      return
    }
    setError(null)
    setCargando(true)
    try {
      const res = await obtenerPayloadEtiquetasProducto(productoId)
      if (!res.ok || !res.data) {
        setError(res.error ?? 'No se pudo cargar las variantes')
        setAbierto(true)
        return
      }
      const { payload, variantes } = res.data
      setPayloadBase(payload)
      setFilas(
        variantes.map((v) => ({
          ...v,
          activa: v.stock > 0,
          cantidadInput: Math.max(1, v.stock),
        }))
      )
      setAbierto(true)
    } finally {
      setCargando(false)
    }
  }

  function toggleActiva(id: string) {
    setFilas((prev) =>
      prev.map((f) => (f.id === id ? { ...f, activa: !f.activa } : f))
    )
  }

  function setCantidad(id: string, val: number) {
    setFilas((prev) =>
      prev.map((f) => (f.id === id ? { ...f, cantidadInput: Math.max(1, val) } : f))
    )
  }

  function totalEtiquetas() {
    return filas.filter((f) => f.activa).reduce((acc, f) => acc + f.cantidadInput, 0)
  }

  function onImprimir() {
    if (!payloadBase) return
    const activas = filas.filter((f) => f.activa)
    if (activas.length === 0) {
      setError('Seleccioná al menos una variante')
      return
    }
    const total = totalEtiquetas()
    if (total > 500) {
      setError(`Total de etiquetas (${total}) supera el límite de 500`)
      return
    }
    const itemsActivos = payloadBase.items
      .filter((item) => activas.some((a) => a.id === item.variante_id))
      .map((item) => {
        const fila = activas.find((a) => a.id === item.variante_id)!
        return { ...item, cantidad: fila.cantidadInput }
      })
    const payloadFinal = { ...payloadBase, items: itemsActivos }
    imprimirConPayload('etiqueta', payloadFinal, <HojaEtiquetas payload={payloadFinal} />)
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={abrir}
        disabled={cargando}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:border-orange-300 transition-colors disabled:opacity-60"
        title="Imprimir etiquetas de todo el producto"
      >
        🏷️ {cargando ? 'Cargando…' : 'Imprimir etiquetas'}
      </button>

      {abierto && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setAbierto(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 z-50 mt-1 w-80 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">Etiquetas del producto</span>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            </div>

            {error && (
              <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-xs text-red-700">
                {error}
              </div>
            )}

            {filas.length > 0 ? (
              <>
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 w-6">
                          <input
                            type="checkbox"
                            checked={filas.every((f) => f.activa)}
                            onChange={(e) =>
                              setFilas((prev) =>
                                prev.map((f) => ({ ...f, activa: e.target.checked }))
                              )
                            }
                            className="rounded"
                          />
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Variante</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500 w-20">
                          Cantidad
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map((fila) => (
                        <tr key={fila.id} className="border-t border-gray-50">
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={fila.activa}
                              onChange={() => toggleActiva(fila.id)}
                              className="rounded"
                            />
                          </td>
                          <td
                            className={`px-3 py-2 ${fila.activa ? 'text-gray-800' : 'text-gray-400'}`}
                          >
                            {fila.nombre}
                            {fila.stock === 0 && (
                              <span className="ml-1 text-gray-400">(sin stock)</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min={1}
                              max={500}
                              value={fila.cantidadInput}
                              disabled={!fila.activa}
                              onChange={(e) =>
                                setCantidad(fila.id, Number(e.target.value || 1))
                              }
                              className="w-16 text-right text-xs py-1"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500">
                    Total:{' '}
                    <span className="font-semibold text-gray-800">{totalEtiquetas()}</span>{' '}
                    etiquetas
                  </span>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={onImprimir}
                    disabled={totalEtiquetas() === 0}
                  >
                    Imprimir
                  </Button>
                </div>
              </>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No hay variantes disponibles
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
