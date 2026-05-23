'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button, LinkButton } from '@/components/ui/Button'
import { VariantesEditor } from './VariantesEditor'
import { BarcodeButton } from './BarcodeButton'
import { InlineCreate } from './InlineCreate'
import { useAutoFocus } from '@/lib/hooks/useAutoFocus'
import {
  crearProducto,
  actualizarProducto,
  crearCategoriaInline,
  guardarComponentesBundle,
  buscarVariantesParaBundle,
  type ProductoInput,
  type VarianteInput,
  type ComponenteBundleItem,
} from '@/app/actions/productos'
import type { Categoria, Talla, Color } from '@/types/database'
import { useRubro } from '@/components/layout/RubroProvider'
import { TODAS_LAS_UNIDADES } from '@/lib/rubro/config'

interface ProductoFormProps {
  modo: 'crear' | 'editar'
  productoId?: string
  initial?: Partial<ProductoInput>
  initialVariantes?: VarianteInput[]
  categorias: Categoria[]
  tallas: Talla[]
  colores: Color[]
  /** Código de barras pre-llenado desde el flujo barcode-first (?codigo=) */
  initialCodigoBarras?: string
  /** Bundle init props (solo en modo editar) */
  esBundleInit?: boolean
  componentesInit?: ComponenteBundleItem[]
  varianteBundleId?: string
}

export function ProductoForm({
  modo,
  productoId,
  initial,
  initialVariantes,
  categorias: categoriasProp,
  tallas,
  colores,
  initialCodigoBarras,
  esBundleInit = false,
  componentesInit = [],
  varianteBundleId,
}: ProductoFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const nombreRef = useRef<HTMLInputElement>(null)
  useAutoFocus(nombreRef)
  const { unidadesDisponibles, labelVar1, labelVar2, usarVar2, defaultSinVariantes } = useRubro()
  const unidadesOpciones = TODAS_LAS_UNIDADES.filter((u) => unidadesDisponibles.includes(u.value))

  // Categorías con soporte de creación inline
  const [categoriasLocales, setCategoriasLocales] = useState<Categoria[]>(categoriasProp)

  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? '')
  const [codigoBase, setCodigoBase] = useState(initial?.codigo_base ?? '')
  const [categoriaId, setCategoriaId] = useState<string>(initial?.categoria_id ?? '')
  const [precioCompra, setPrecioCompra] = useState<number>(initial?.precio_compra ?? 0)
  const [precioVenta, setPrecioVenta] = useState<number>(initial?.precio_venta ?? 0)
  const [unidadMedida, setUnidadMedida] = useState<string>(initial?.unidad_de_medida ?? 'unidad')
  const [imagenUrl, setImagenUrl] = useState(initial?.imagen_url ?? '')

  // Modo simple: sin variantes (para rubros como despensa, farmacia, etc.)
  // En modo editar siempre usamos variantes (ya existen)
  const [tieneVariantes, setTieneVariantes] = useState<boolean>(
    modo === 'editar'
      ? true
      : initialCodigoBarras
        ? false                              // barcode-first → siempre modo simple
        : (initialVariantes?.length ?? 0) > 0
          ? true                             // ya tiene variantes cargadas
          : !defaultSinVariantes             // por defecto según rubro
  )
  // Campos del modo simple (producto sin variantes)
  const [simpleCodigoBarras, setSimpleCodigoBarras] = useState(initialCodigoBarras ?? '')
  const [simpleStock, setSimpleStock] = useState<number>(0)

  // Bundle / Pack state (solo modo editar)
  const [esBundle, setEsBundle] = useState(esBundleInit)
  const [componentes, setComponentes] = useState<ComponenteBundleItem[]>(componentesInit)
  const [bundleQuery, setBundleQuery] = useState('')
  const [bundleResults, setBundleResults] = useState<ComponenteBundleItem[]>([])
  const [bundleSearching, setBundleSearching] = useState(false)
  const [simpleStockMinimo, setSimpleStockMinimo] = useState<number>(0)

  // Variantes pre-inicializadas (usado en modo con-variantes también)
  const initialVars: VarianteInput[] = initialVariantes ?? (
    initialCodigoBarras
      ? [{ talla_id: null, color_id: null, codigo_barras: initialCodigoBarras, precio_venta: null, stock_inicial: 0, stock_minimo: 0 }]
      : []
  )
  const [variantes, setVariantes] = useState<VarianteInput[]>(initialVars)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // En modo simple construimos la variante única a partir de los campos simples
    const variantesParaEnviar: VarianteInput[] = tieneVariantes
      ? variantes
      : [
          {
            talla_id: null,
            color_id: null,
            codigo_barras: simpleCodigoBarras || null,
            precio_venta: Number(precioVenta) || null,
            stock_inicial: Number(simpleStock) || 0,
            stock_minimo: Number(simpleStockMinimo) || 0,
          },
        ]

    const input: ProductoInput = {
      nombre,
      descripcion: descripcion || null,
      codigo_base: codigoBase || null,
      categoria_id: categoriaId || null,
      precio_compra: Number(precioCompra) || 0,
      precio_venta: Number(precioVenta) || 0,
      unidad_de_medida: unidadMedida || 'unidad',
      imagen_url: imagenUrl || null,
      variantes: variantesParaEnviar,
    }
    startTransition(async () => {
      const res =
        modo === 'crear'
          ? await crearProducto(input)
          : await actualizarProducto(productoId!, input)
      if (!res.ok) {
        setError(res.error ?? 'Error desconocido')
        return
      }
      // En modo editar, guardar componentes del bundle
      if (modo === 'editar' && varianteBundleId) {
        const bundleRes = await guardarComponentesBundle(
          productoId!,
          varianteBundleId,
          esBundle ? componentes.map((c) => ({ componente_variante_id: c.componente_variante_id, cantidad: c.cantidad })) : []
        )
        if (!bundleRes.ok) {
          setError(bundleRes.error ?? 'Error al guardar componentes del bundle')
          return
        }
      }
      if (modo === 'crear' && res.data && typeof res.data === 'object' && 'id' in res.data) {
        toast.success('Producto creado exitosamente')
        router.push(`/productos/${(res.data as { id: string }).id}`)
      } else {
        toast.success('Cambios guardados')
        router.push('/productos')
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.10em] text-gray-400">Información del producto</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            ref={nombreRef}
            label="Nombre *"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            maxLength={200}
          />
          <div>
            <Select
              label="Categoría"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              <option value="">— Sin categoría —</option>
              {categoriasLocales.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
            <div className="mt-1">
              <InlineCreate
                label="categoría"
                onConfirm={async (nombre) => {
                  const res = await crearCategoriaInline(nombre)
                  if (!res.ok || !res.data) return null
                  return res.data
                }}
                onCreated={(item) => {
                  setCategoriasLocales((prev) => [...prev, { id: item.id, nombre: item.nombre, tienda_id: '', descripcion: null, activo: true, created_at: '', updated_at: '' }])
                  setCategoriaId(item.id)
                }}
              />
            </div>
          </div>
          <Input
            label="Código base (interno)"
            value={codigoBase}
            onChange={(e) => setCodigoBase(e.target.value)}
            placeholder="Opcional, ej: REM-001"
          />
          <Input
            label="URL de imagen"
            type="url"
            value={imagenUrl}
            onChange={(e) => setImagenUrl(e.target.value)}
            placeholder="https://..."
          />
          <Input
            label="Precio compra"
            type="number"
            step="0.01"
            min="0"
            value={precioCompra}
            onChange={(e) => setPrecioCompra(Number(e.target.value))}
          />
          <Input
            label="Precio venta *"
            type="number"
            step="0.01"
            min="0"
            value={precioVenta}
            onChange={(e) => setPrecioVenta(Number(e.target.value))}
            required
          />
          <Select
            label="Unidad de medida"
            value={unidadMedida}
            onChange={(e) => setUnidadMedida(e.target.value)}
          >
            {unidadesOpciones.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </Select>
        </div>

        <Textarea
          label="Descripción"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
        />
      </div>

      {/* Toggle modo con/sin variantes — solo en crear */}
      {modo === 'crear' && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">¿Este producto tiene variantes?</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {tieneVariantes
                  ? usarVar2
                    ? `Con ${labelVar1.toLowerCase()} y ${labelVar2.toLowerCase()}`
                    : `Con ${labelVar1.toLowerCase()}`
                  : 'Producto único — un solo código de barras'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTieneVariantes(!tieneVariantes)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                tieneVariantes ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  tieneVariantes ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Modo simple: campos de código, stock y stock mínimo */}
          {!tieneVariantes && (
            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Input
                  label="Código de barras"
                  value={simpleCodigoBarras}
                  onChange={(e) => setSimpleCodigoBarras(e.target.value)}
                  placeholder="Escanear o ingresar"
                />
                <BarcodeButton onGenerated={(codigo) => setSimpleCodigoBarras(codigo)} />
              </div>
              <Input
                label="Stock inicial"
                type="number"
                min="0"
                value={simpleStock}
                onChange={(e) => setSimpleStock(Number(e.target.value))}
              />
              <Input
                label="Stock mínimo"
                type="number"
                min="0"
                value={simpleStockMinimo}
                onChange={(e) => setSimpleStockMinimo(Number(e.target.value))}
              />
            </div>
          )}
        </div>
      )}

      {/* Editor de variantes */}
      {(modo === 'editar' || tieneVariantes) && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <VariantesEditor
            tallas={tallas}
            colores={colores}
            initial={initialVars.length > 0 ? initialVars : undefined}
            onChange={setVariantes}
            modoEdicion={modo === 'editar'}
          />
        </div>
      )}

      {/* Bundle / Pack — solo en modo editar, cuando hay una variante */}
      {modo === 'editar' && varianteBundleId && (
        <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.10em] text-gray-400">Bundle / Pack</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {esBundle
                  ? 'El stock disponible se calcula desde los componentes'
                  : 'Este producto tiene su propio stock'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (esBundle && componentes.length > 0) {
                  if (!confirm('\u00bfDesactivar bundle? Los componentes configurados se eliminarán al guardar.')) return
                }
                setEsBundle(!esBundle)
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                esBundle ? 'bg-lime-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  esBundle ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {esBundle && (
            <div className="space-y-3">
              {/* Componentes actuales */}
              {componentes.length > 0 && (
                <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg">
                  {componentes.map((c) => (
                    <div key={c.componente_variante_id} className="flex items-center gap-3 px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {c.nombre}
                          {c.talla && <span className="text-gray-400 ml-1">({c.talla})</span>}
                          {c.color && <span className="text-gray-400 ml-1">/{c.color}</span>}
                        </p>
                        <p className="text-xs text-gray-400">
                          Stock: {c.stock_actual} • Costo: ${c.precio_compra}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Cant.:</span>
                        <input
                          type="number"
                          min="1"
                          value={c.cantidad}
                          onChange={(e) => {
                            const val = Math.max(1, Number(e.target.value))
                            setComponentes((prev) =>
                              prev.map((x) =>
                                x.componente_variante_id === c.componente_variante_id
                                  ? { ...x, cantidad: val }
                                  : x
                              )
                            )
                          }}
                          className="w-16 border border-gray-200 rounded px-2 py-1 text-sm text-center"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setComponentes((prev) =>
                              prev.filter((x) => x.componente_variante_id !== c.componente_variante_id)
                            )
                          }
                          className="text-red-400 hover:text-red-600 p-1"
                          aria-label="Eliminar componente"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Buscador de componentes */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar producto para agregar como componente..."
                  value={bundleQuery}
                  onChange={async (e) => {
                    const q = e.target.value
                    setBundleQuery(q)
                    if (q.trim().length < 2) { setBundleResults([]); return }
                    setBundleSearching(true)
                    const res = await buscarVariantesParaBundle(q, varianteBundleId)
                    setBundleResults(res.ok ? (res.data ?? []) : [])
                    setBundleSearching(false)
                  }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500"
                />
                {bundleSearching && (
                  <span className="absolute right-3 top-2.5 text-xs text-gray-400">Buscando...</span>
                )}
                {bundleResults.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {bundleResults
                      .filter((r) => !componentes.some((c) => c.componente_variante_id === r.componente_variante_id))
                      .map((r) => (
                        <button
                          key={r.componente_variante_id}
                          type="button"
                          onClick={() => {
                            setComponentes((prev) => [...prev, { ...r, cantidad: 1 }])
                            setBundleQuery('')
                            setBundleResults([])
                          }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between items-center"
                        >
                          <span>
                            {r.nombre}
                            {r.talla && <span className="text-gray-400 ml-1">({r.talla})</span>}
                            {r.color && <span className="text-gray-400 ml-1">/{r.color}</span>}
                          </span>
                          <span className="text-xs text-gray-400">Stock: {r.stock_actual}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <LinkButton href="/productos" variant="ghost">
          Cancelar
        </LinkButton>
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando...' : modo === 'crear' ? 'Crear producto' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
