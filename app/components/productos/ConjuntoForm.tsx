'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button, LinkButton } from '@/components/ui/Button'
import { crearConjuntoCompleto, type ConjuntoInput } from '@/app/actions/productos'
import type { Categoria, Talla, Color } from '@/types/database'

interface PiezaState {
  uid: string
  nombre: string
  precioVenta: string
  precioCompra: string
  stockPorVariante: Record<string, string>
  expandida: boolean
}

interface ConjuntoFormProps {
  categorias: Categoria[]
  tallas: Talla[]
  colores: Color[]
}

function uid() {
  return Math.random().toString(36).slice(2)
}

function varKey(tallaId: string | null, colorId: string | null) {
  return `${tallaId ?? 'null'}__${colorId ?? 'null'}`
}

export function ConjuntoForm({ categorias, tallas, colores }: ConjuntoFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // — Kit info
  const [nombre, setNombre] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [precioCompra, setPrecioCompra] = useState('')
  const [categoriaId, setCategoriaId] = useState<string>('')

  // — Variantes: selección de tallas y colores
  const [tallasSeleccionadas, setTallasSeleccionadas] = useState<string[]>([])
  const [coloresSeleccionados, setColoresSeleccionados] = useState<string[]>([])

  // — Piezas
  const [piezas, setPiezas] = useState<PiezaState[]>([
    { uid: uid(), nombre: '', precioVenta: '', precioCompra: '', stockPorVariante: {}, expandida: true },
  ])

  // Combinaciones derivadas
  const combinaciones = useMemo(() => {
    if (tallasSeleccionadas.length === 0 && coloresSeleccionados.length === 0) return []
    if (tallasSeleccionadas.length === 0) {
      return coloresSeleccionados.map((cid) => ({
        talla_id: null as string | null,
        color_id: cid,
        key: varKey(null, cid),
        label: colores.find((c) => c.id === cid)?.nombre ?? cid,
      }))
    }
    if (coloresSeleccionados.length === 0) {
      return tallasSeleccionadas.map((tid) => ({
        talla_id: tid,
        color_id: null as string | null,
        key: varKey(tid, null),
        label: tallas.find((t) => t.id === tid)?.nombre ?? tid,
      }))
    }
    return tallasSeleccionadas.flatMap((tid) =>
      coloresSeleccionados.map((cid) => ({
        talla_id: tid,
        color_id: cid,
        key: varKey(tid, cid),
        label: `${tallas.find((t) => t.id === tid)?.nombre ?? tid} / ${colores.find((c) => c.id === cid)?.nombre ?? cid}`,
      }))
    )
  }, [tallasSeleccionadas, coloresSeleccionados, tallas, colores])

  // — Helpers para piezas
  function agregarPieza() {
    setPiezas((prev) => [
      ...prev,
      { uid: uid(), nombre: '', precioVenta: '', precioCompra: '', stockPorVariante: {}, expandida: true },
    ])
  }

  function quitarPieza(piezaUid: string) {
    setPiezas((prev) => prev.filter((p) => p.uid !== piezaUid))
  }

  function updatePieza(piezaUid: string, cambios: Partial<PiezaState>) {
    setPiezas((prev) => prev.map((p) => (p.uid === piezaUid ? { ...p, ...cambios } : p)))
  }

  function setStock(piezaUid: string, key: string, value: string) {
    setPiezas((prev) =>
      prev.map((p) =>
        p.uid === piezaUid
          ? { ...p, stockPorVariante: { ...p.stockPorVariante, [key]: value } }
          : p
      )
    )
  }

  function toggleTalla(id: string) {
    setTallasSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleColor(id: string) {
    setColoresSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!nombre.trim()) { setError('El nombre del conjunto es requerido.'); return }
    if (!precioVenta || Number(precioVenta) <= 0) { setError('El precio del conjunto es requerido.'); return }
    if (combinaciones.length === 0) { setError('Seleccioná al menos una talla o color.'); return }
    if (piezas.length === 0) { setError('Agregá al menos una pieza.'); return }
    for (const p of piezas) {
      if (!p.nombre.trim()) { setError('Completá el nombre de todas las piezas.'); return }
      if (!p.precioVenta || Number(p.precioVenta) <= 0) { setError(`Completá el precio de "${p.nombre || 'la pieza'}".`); return }
    }

    const input: ConjuntoInput = {
      nombre: nombre.trim(),
      precio_venta: Number(precioVenta),
      precio_compra: Number(precioCompra) || 0,
      categoria_id: categoriaId || null,
      variantes: combinaciones.map((c) => ({ talla_id: c.talla_id, color_id: c.color_id })),
      piezas: piezas.map((p) => ({
        nombre: p.nombre.trim(),
        precio_venta: Number(p.precioVenta),
        precio_compra: Number(p.precioCompra) || 0,
        categoria_id: categoriaId || null,
        stock_por_variante: Object.fromEntries(
          combinaciones.map((c) => [c.key, Number(p.stockPorVariante[c.key] ?? 0)])
        ),
      })),
    }

    startTransition(async () => {
      try {
        const result = await crearConjuntoCompleto(input)
        if (result.ok && result.data) {
          toast.success('Conjunto creado correctamente')
          router.push(`/productos/${result.data.productoId}`)
          router.refresh()
        } else {
          setError(result.error ?? 'Error desconocido')
        }
      } catch (e) {
        setError((e as Error).message ?? 'Error inesperado al crear el conjunto')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">

      {/* — Info del conjunto (kit) */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🧩</span>
          <h2 className="text-sm font-semibold text-gray-800">Datos del conjunto</h2>
        </div>
        <Input
          label="Nombre del conjunto *"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Conjunto estrellado"
          autoFocus
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Precio de venta *"
            type="number"
            min="0"
            step="0.01"
            value={precioVenta}
            onChange={(e) => setPrecioVenta(e.target.value)}
            placeholder="Precio del conjunto"
          />
          <Input
            label="Precio de compra"
            type="number"
            min="0"
            step="0.01"
            value={precioCompra}
            onChange={(e) => setPrecioCompra(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <Select
          label="Categoría"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
        >
          <option value="">Sin categoría</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </Select>
      </div>

      {/* — Variantes: tallas y colores */}
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800">Tallas y colores del conjunto</h2>
        <p className="text-xs text-gray-400">Seleccioná las tallas y colores disponibles. Las piezas usarán la misma combinación.</p>

        {/* Tallas */}
        {tallas.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">Tallas</p>
            <div className="flex flex-wrap gap-2">
              {tallas.map((t) => {
                const sel = tallasSeleccionadas.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTalla(t.id)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      sel
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-purple-400'
                    }`}
                  >
                    {t.nombre}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Colores */}
        {colores.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-600">Colores</p>
            <div className="flex flex-wrap gap-2">
              {colores.map((c) => {
                const sel = coloresSeleccionados.includes(c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleColor(c.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      sel
                        ? 'bg-purple-600 border-purple-600 text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-purple-400'
                    }`}
                  >
                    {(c as unknown as { hex_color?: string }).hex_color && (
                      <span
                        className="w-3 h-3 rounded-full border border-white/40 flex-shrink-0"
                        style={{ backgroundColor: (c as unknown as { hex_color: string }).hex_color }}
                      />
                    )}
                    {c.nombre}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Preview combinaciones */}
        {combinaciones.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-gray-50">
            {combinaciones.map((combo) => (
              <span
                key={combo.key}
                className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-[11px] font-medium"
              >
                {combo.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* — Piezas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Piezas del conjunto</h2>
          <button
            type="button"
            onClick={agregarPieza}
            className="flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar pieza
          </button>
        </div>

        {piezas.map((pieza, idx) => (
          <div key={pieza.uid} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
            {/* Header pieza */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
              <span className="text-xs font-bold text-purple-600 bg-purple-50 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </span>
              <span className="flex-1 text-sm font-medium text-gray-700 truncate">
                {pieza.nombre || `Pieza ${idx + 1}`}
              </span>
              <button
                type="button"
                onClick={() => updatePieza(pieza.uid, { expandida: !pieza.expandida })}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                {pieza.expandida ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {piezas.length > 1 && (
                <button
                  type="button"
                  onClick={() => quitarPieza(pieza.uid)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {pieza.expandida && (
              <div className="p-4 space-y-4">
                {/* Nombre y precios */}
                <Input
                  label="Nombre de la pieza *"
                  value={pieza.nombre}
                  onChange={(e) => updatePieza(pieza.uid, { nombre: e.target.value })}
                  placeholder="Ej: Buzo estrellado"
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Precio unitario *"
                    type="number"
                    min="0"
                    step="0.01"
                    value={pieza.precioVenta}
                    onChange={(e) => updatePieza(pieza.uid, { precioVenta: e.target.value })}
                    placeholder="Precio individual"
                  />
                  <Input
                    label="Precio compra"
                    type="number"
                    min="0"
                    step="0.01"
                    value={pieza.precioCompra}
                    onChange={(e) => updatePieza(pieza.uid, { precioCompra: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>

                {/* Stock por variante */}
                {combinaciones.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600">Stock inicial por variante</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {combinaciones.map((combo) => (
                        <div key={combo.key} className="space-y-0.5">
                          <label className="text-[11px] text-gray-500 font-medium">{combo.label}</label>
                          <input
                            type="number"
                            min="0"
                            value={pieza.stockPorVariante[combo.key] ?? ''}
                            onChange={(e) => setStock(pieza.uid, combo.key, e.target.value)}
                            placeholder="0"
                            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {combinaciones.length === 0 && (
                  <p className="text-xs text-gray-400 italic">
                    Seleccioná tallas/colores arriba para ingresar stock por variante.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Resumen */}
      {combinaciones.length > 0 && piezas.some((p) => p.nombre) && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-xs text-purple-700 space-y-0.5">
          <p className="font-semibold">Se van a crear {1 + piezas.length} productos:</p>
          <p>• {nombre || 'Conjunto'} (kit) — {combinaciones.length} variante{combinaciones.length !== 1 ? 's' : ''}</p>
          {piezas.map((p, i) => (
            <p key={p.uid}>• {p.nombre || `Pieza ${i + 1}`} — {combinaciones.length} variante{combinaciones.length !== 1 ? 's' : ''}</p>
          ))}
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? 'Creando...' : `Crear conjunto completo`}
        </Button>
        <LinkButton href="/productos" variant="secondary">
          Cancelar
        </LinkButton>
      </div>
    </form>
  )
}
