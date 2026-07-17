'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  asociarCodigoAVariante,
  buscarVariantesParaAsociar,
  type VarianteParaAsociar,
} from '@/app/actions/productos'
import { Input } from '@/components/ui/Input'
import { useRubro } from '@/components/layout/RubroProvider'

interface CodigoDesconocidoModalProps {
  open: boolean
  codigo: string | null
  usarPack: boolean
  onClose: () => void
  onCrear: (codigo: string) => void
  onAsociado: (result: { producto_id: string; variante_id: string }) => void
}

type Paso = 'decision' | 'asociar'
type RolCodigo = 'unidad' | 'pack'

export function CodigoDesconocidoModal({
  open,
  codigo,
  usarPack,
  onClose,
  onCrear,
  onAsociado,
}: CodigoDesconocidoModalProps) {
  const { labelVar1, labelVar2, usarVar2 } = useRubro()
  const [paso, setPaso] = useState<Paso>('decision')
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<VarianteParaAsociar[]>([])
  const [seleccionada, setSeleccionada] = useState<VarianteParaAsociar | null>(null)
  const [rol, setRol] = useState<RolCodigo>('unidad')
  const [error, setError] = useState<string | null>(null)
  const [buscando, startBusqueda] = useTransition()
  const [guardando, startGuardado] = useTransition()

  function resetModal() {
    setPaso('decision')
    setQuery('')
    setResultados([])
    setSeleccionada(null)
    setRol('unidad')
    setError(null)
  }

  function cerrar() {
    resetModal()
    onClose()
  }

  useEffect(() => {
    if (!open || paso !== 'asociar') return
    const q = query.trim()
    if (q.length < 2) return
    const timer = setTimeout(() => {
      startBusqueda(async () => {
        const res = await buscarVariantesParaAsociar(q)
        if (!res.ok) {
          setError(res.error ?? 'No se pudieron buscar productos')
          setResultados([])
          return
        }
        setError(null)
        setResultados(res.data ?? [])
      })
    }, 250)
    return () => clearTimeout(timer)
  }, [open, paso, query])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPaso('decision')
        setQuery('')
        setResultados([])
        setSeleccionada(null)
        setRol('unidad')
        setError(null)
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || !codigo) return null

  function confirmarAsociacion() {
    if (!seleccionada || !codigo) return
    setError(null)
    startGuardado(async () => {
      const res = await asociarCodigoAVariante({
        varianteId: seleccionada.id,
        codigo,
        rol,
      })
      if (!res.ok || !res.data) {
        setError(res.error ?? 'No se pudo asociar el código')
        return
      }
      resetModal()
      onAsociado(res.data)
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) cerrar()
      }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div>
            <h2 className="text-[15px] font-semibold text-gray-950">Código no encontrado</h2>
            <code className="text-xs text-amber-700">{codigo}</code>
          </div>
          <button
            type="button"
            onClick={cerrar}
            className="text-xl leading-none text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {paso === 'decision' ? (
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                resetModal()
                onCrear(codigo)
              }}
              className="rounded-xl border border-gray-200 p-5 text-left transition-colors hover:border-lime-400 hover:bg-lime-50"
            >
              <span className="text-2xl">＋</span>
              <span className="mt-2 block text-sm font-semibold text-gray-900">
                Crear producto nuevo
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                Abrir el alta con este código precargado.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPaso('asociar')}
              className="rounded-xl border border-gray-200 p-5 text-left transition-colors hover:border-lime-400 hover:bg-lime-50"
            >
              <span className="text-2xl">🔗</span>
              <span className="mt-2 block text-sm font-semibold text-gray-900">
                Asociar a un producto
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                Elegir una variante existente como unidad o pack.
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 p-5">
            <Input
              label="Buscar producto"
              placeholder="Nombre, código base o código de barras…"
              value={query}
              onChange={(event) => {
                const next = event.target.value
                setQuery(next)
                if (next.trim().length < 2) setResultados([])
                setSeleccionada(null)
              }}
              autoFocus
            />

            <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200">
              {buscando ? (
                <p className="p-4 text-sm text-gray-500">Buscando…</p>
              ) : query.trim().length < 2 ? (
                <p className="p-4 text-sm text-gray-500">Escribí al menos 2 caracteres.</p>
              ) : resultados.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">No se encontraron variantes.</p>
              ) : (
                resultados.map((variante) => {
                  const activa = seleccionada?.id === variante.id
                  const detalle = [
                    variante.talla ? `${labelVar1}: ${variante.talla}` : null,
                    usarVar2 && variante.color ? `${labelVar2}: ${variante.color}` : null,
                    variante.codigo_barras ? `Unidad: ${variante.codigo_barras}` : 'Sin código de unidad',
                  ]
                    .filter(Boolean)
                    .join(' · ')
                  return (
                    <button
                      key={variante.id}
                      type="button"
                      onClick={() => {
                        setSeleccionada(variante)
                        setRol(variante.codigo_barras ? 'pack' : 'unidad')
                        setError(null)
                      }}
                      className={[
                        'block w-full border-b border-gray-100 px-4 py-3 text-left last:border-b-0',
                        activa ? 'bg-lime-50 ring-2 ring-inset ring-lime-400' : 'hover:bg-gray-50',
                      ].join(' ')}
                    >
                      <span className="block text-sm font-semibold text-gray-900">
                        {variante.producto_nombre}
                      </span>
                      <span className="block text-xs text-gray-500">{detalle}</span>
                      {variante.pack_habilitado && variante.pack_cantidad && (
                        <span className="mt-1 inline-block text-xs text-lime-700">
                          Pack ×{variante.pack_cantidad}
                          {variante.pack_codigo_barras
                            ? ` · Código: ${variante.pack_codigo_barras}`
                            : ' · Sin código'}
                        </span>
                      )}
                    </button>
                  )
                })
              )}
            </div>

            {seleccionada && (
              <fieldset className="space-y-2 rounded-xl bg-gray-50 p-4">
                <legend className="px-1 text-xs font-semibold text-gray-700">
                  Usar el código como
                </legend>
                <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-800">
                  <input
                    type="radio"
                    name="rol-codigo"
                    checked={rol === 'unidad'}
                    disabled={Boolean(seleccionada.codigo_barras)}
                    onChange={() => setRol('unidad')}
                    className="mt-0.5"
                  />
                  <span>
                    Código de unidad
                    {seleccionada.codigo_barras && (
                      <span className="block text-xs text-amber-700">
                        Ya tiene uno; no se reemplazará.
                      </span>
                    )}
                  </span>
                </label>
                {usarPack && (
                  <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-800">
                    <input
                      type="radio"
                      name="rol-codigo"
                      checked={rol === 'pack'}
                      disabled={
                        !seleccionada.pack_habilitado ||
                        Boolean(seleccionada.pack_codigo_barras)
                      }
                      onChange={() => setRol('pack')}
                      className="mt-0.5"
                    />
                    <span>
                      Código de pack
                      {!seleccionada.pack_habilitado && (
                        <span className="block text-xs text-amber-700">
                          Primero activá y configurá el pack en el producto.
                        </span>
                      )}
                      {seleccionada.pack_codigo_barras && (
                        <span className="block text-xs text-amber-700">
                          El pack ya tiene un código asociado.
                        </span>
                      )}
                    </span>
                  </label>
                )}
              </fieldset>
            )}

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setPaso('decision')
                  setError(null)
                }}
                className="h-10 rounded-full border border-gray-200 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Atrás
              </button>
              <button
                type="button"
                onClick={confirmarAsociacion}
                disabled={
                  !seleccionada ||
                  guardando ||
                  (rol === 'unidad' && Boolean(seleccionada.codigo_barras)) ||
                  (rol === 'pack' &&
                    (!seleccionada.pack_habilitado || Boolean(seleccionada.pack_codigo_barras)))
                }
                className="h-10 rounded-full bg-gray-950 px-5 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {guardando ? 'Asociando…' : 'Asociar código'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
