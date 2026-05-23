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
  type ProductoInput,
  type VarianteInput,
} from '@/app/actions/productos'
import type { KitComponenteState } from './KitComponentesEditor'
import { KitAutoAsignar } from './KitAutoAsignar'
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
  /** Si el producto es un kit (para modo editar) */
  initialEsKit?: boolean
  /** Componentes del kit por variante (clave = variante.id) */
  initialKitComponentes?: Record<string, KitComponenteState[]>
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
  initialEsKit = false,
  initialKitComponentes,
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
  const [simpleStockMinimo, setSimpleStockMinimo] = useState<number>(0)

  // Variantes pre-inicializadas (usado en modo con-variantes también)
  const initialVars: VarianteInput[] = initialVariantes ?? (
    initialCodigoBarras
      ? [{ talla_id: null, color_id: null, codigo_barras: initialCodigoBarras, precio_venta: null, stock_inicial: 0, stock_minimo: 0 }]
      : []
  )
  const [variantes, setVariantes] = useState<VarianteInput[]>(initialVars)

  // Kit
  const [esKit, setEsKit] = useState<boolean>(initial?.es_kit ?? initialEsKit)
  const [kitCompsPorVariante, setKitCompsPorVariante] = useState<Record<string, KitComponenteState[]>>(
    initialKitComponentes ?? {}
  )

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
      es_kit: esKit,
      kit_componentes_por_variante: esKit ? kitCompsPorVariante : undefined,
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
        <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
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
            <div className="pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* Toggle Kit/Armado — solo en edición */}
      {modo === 'editar' && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">¿Es un kit / armado?</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {esKit
                  ? 'El stock se calcula automáticamente desde los componentes'
                  : 'Activá si este producto se arma combinando otros productos (ej: conjunto remera + calza)'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEsKit(!esKit)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                esKit ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  esKit ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {esKit && (
            <p className="mt-2 text-xs text-purple-600 bg-purple-50 rounded-lg px-3 py-2">
              🧩 Las variantes del kit no tienen stock propio. Configurá los componentes de cada variante en el editor de abajo.
            </p>
          )}
        </div>
      )}

      {/* Auto-asignador de componentes del kit — solo en edición */}
      {esKit && modo === 'editar' && variantes.length > 0 && (
        <KitAutoAsignar
          kitVariantes={variantes.map((v, idx) => ({
            varKey: v.id ?? String(idx),
            talla_id: v.talla_id,
            color_id: v.color_id,
          }))}
          onAplicar={(resultado) =>
            setKitCompsPorVariante((prev) => ({ ...prev, ...resultado }))
          }
        />
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
            esKit={esKit}
            initialKitComponentes={initialKitComponentes}
            onKitComponentesChange={setKitCompsPorVariante}
          />
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
