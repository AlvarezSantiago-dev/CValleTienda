'use client'

import { useEffect, useState, useTransition } from 'react'
import { Link2, Plus } from 'lucide-react'
import {
  asociarCodigoAVariante,
  buscarVariantesParaAsociar,
  type VarianteParaAsociar,
} from '@/app/actions/productos'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
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
  const [packCantidad, setPackCantidad] = useState(6)
  const [packPrecio, setPackPrecio] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [buscando, startBusqueda] = useTransition()
  const [guardando, startGuardado] = useTransition()

  function resetModal() {
    setPaso('decision')
    setQuery('')
    setResultados([])
    setSeleccionada(null)
    setRol('unidad')
    setPackCantidad(6)
    setPackPrecio('')
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

  function confirmarAsociacion() {
    if (!seleccionada || !codigo) return
    setError(null)
    const habilitarPack =
      rol === 'pack' && !seleccionada.pack_habilitado
        ? {
            pack_cantidad: packCantidad,
            pack_precio: Number(packPrecio.replace(',', '.')),
          }
        : undefined
    if (habilitarPack) {
      if (
        habilitarPack.pack_cantidad <= 1 ||
        !Number.isFinite(habilitarPack.pack_precio) ||
        habilitarPack.pack_precio <= 0
      ) {
        setError('Indicá cantidad (mín. 2) y precio del pack')
        return
      }
    }
    startGuardado(async () => {
      const res = await asociarCodigoAVariante({
        varianteId: seleccionada.id,
        codigo,
        rol,
        habilitarPack,
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
    <Modal
      open={open && Boolean(codigo)}
      onClose={cerrar}
      title="Código no encontrado"
      description={codigo ?? undefined}
      size="lg"
      footer={
        paso === 'asociar' ? (
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setPaso('decision')
                setError(null)
              }}
            >
              Atrás
            </Button>
            <Button
              type="button"
              onClick={confirmarAsociacion}
              disabled={
                !seleccionada ||
                guardando ||
                (rol === 'unidad' && Boolean(seleccionada.codigo_barras)) ||
                (rol === 'pack' && Boolean(seleccionada.pack_codigo_barras))
              }
            >
              {guardando ? 'Asociando…' : 'Asociar código'}
            </Button>
          </>
        ) : undefined
      }
    >
      {paso === 'decision' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              if (!codigo) return
              resetModal()
              onCrear(codigo)
            }}
            className="rounded-[var(--radius-lg)] border border-border-default p-5 text-left transition-colors hover:border-primary-border hover:bg-primary-soft cursor-pointer focus-ring"
          >
            <Plus size={22} className="text-fg-muted" aria-hidden />
            <span className="mt-2 block text-sm font-semibold text-fg">Crear producto nuevo</span>
            <span className="mt-1 block text-xs text-fg-muted">
              Abrir el alta con este código precargado.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setPaso('asociar')}
            className="rounded-[var(--radius-lg)] border border-border-default p-5 text-left transition-colors hover:border-primary-border hover:bg-primary-soft cursor-pointer focus-ring"
          >
            <Link2 size={22} className="text-fg-muted" aria-hidden />
            <span className="mt-2 block text-sm font-semibold text-fg">Asociar a un producto</span>
            <span className="mt-1 block text-xs text-fg-muted">
              Elegir una variante existente como unidad o pack.
            </span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
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

          <div className="max-h-64 overflow-y-auto rounded-[var(--radius-lg)] border border-border-default">
            {buscando ? (
              <p className="p-4 text-sm text-fg-muted">Buscando…</p>
            ) : query.trim().length < 2 ? (
              <p className="p-4 text-sm text-fg-muted">Escribí al menos 2 caracteres.</p>
            ) : resultados.length === 0 ? (
              <p className="p-4 text-sm text-fg-muted">No se encontraron variantes.</p>
            ) : (
              resultados.map((variante) => {
                const activa = seleccionada?.id === variante.id
                const detalle = [
                  variante.talla ? `${labelVar1}: ${variante.talla}` : null,
                  usarVar2 && variante.color ? `${labelVar2}: ${variante.color}` : null,
                  variante.codigo_barras
                    ? `Unidad: ${variante.codigo_barras}`
                    : 'Sin código de unidad',
                ]
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <button
                    key={variante.id}
                    type="button"
                    onClick={() => {
                      setSeleccionada(variante)
                      const nextRol = variante.codigo_barras ? 'pack' : 'unidad'
                      setRol(nextRol)
                      const cant = variante.pack_cantidad ?? 6
                      setPackCantidad(cant)
                      const unit = variante.precio_venta > 0 ? variante.precio_venta : 0
                      const sugerido =
                        variante.pack_precio != null && variante.pack_precio > 0
                          ? variante.pack_precio
                          : unit > 0
                            ? Math.round(unit * cant * 100) / 100
                            : 0
                      setPackPrecio(sugerido > 0 ? String(sugerido) : '')
                      setError(null)
                    }}
                    className={cn(
                      'block w-full border-b border-border-subtle px-4 py-3 text-left last:border-b-0 cursor-pointer focus-ring',
                      activa
                        ? 'bg-primary-soft ring-2 ring-inset ring-primary'
                        : 'hover:bg-surface-hover'
                    )}
                  >
                    <span className="block text-sm font-semibold text-fg">
                      {variante.producto_nombre}
                    </span>
                    <span className="block text-xs text-fg-muted">{detalle}</span>
                    {variante.pack_habilitado && variante.pack_cantidad && (
                      <span className="mt-1 inline-block text-xs text-fg-brand">
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
            <fieldset className="space-y-2 rounded-[var(--radius-lg)] bg-surface-sunken p-4">
              <legend className="px-1 text-xs font-semibold text-fg-muted">Usar el código como</legend>
              <label className="flex cursor-pointer items-start gap-2 text-sm text-fg">
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
                    <span className="block text-xs text-warning-soft-fg">
                      Ya tiene uno; no se reemplazará.
                    </span>
                  )}
                </span>
              </label>
              {usarPack && (
                <label className="flex cursor-pointer items-start gap-2 text-sm text-fg">
                  <input
                    type="radio"
                    name="rol-codigo"
                    checked={rol === 'pack'}
                    disabled={Boolean(seleccionada.pack_codigo_barras)}
                    onChange={() => setRol('pack')}
                    className="mt-0.5"
                  />
                  <span>
                    Código de pack
                    {!seleccionada.pack_habilitado && !seleccionada.pack_codigo_barras && (
                      <span className="block text-xs text-fg-muted">
                        Si el pack no está activo, completá cantidad y precio abajo al asociar.
                      </span>
                    )}
                    {seleccionada.pack_codigo_barras && (
                      <span className="block text-xs text-warning-soft-fg">
                        El pack ya tiene un código asociado.
                      </span>
                    )}
                  </span>
                </label>
              )}
            </fieldset>
          )}

          {seleccionada && usarPack && rol === 'pack' && !seleccionada.pack_habilitado && (
            <div className="grid gap-3 rounded-[var(--radius-lg)] border border-primary-border bg-primary-soft/50 p-4 sm:grid-cols-2">
              <Input
                label="Unidades por pack"
                type="number"
                min={2}
                value={packCantidad}
                onChange={(e) => setPackCantidad(Number(e.target.value) || 6)}
              />
              <Input
                label="Precio del pack ($)"
                type="text"
                inputMode="decimal"
                placeholder="Ej. 4500"
                value={packPrecio}
                onChange={(e) => setPackPrecio(e.target.value)}
              />
              <p className="sm:col-span-2 text-xs text-fg-muted">
                También podés activarlo en el producto: editar → variantes →{' '}
                <strong className="font-semibold text-fg">Activar pack</strong> (visible sin «Más
                columnas»).
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-[var(--radius-lg)] border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-soft-fg">
              {error}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
