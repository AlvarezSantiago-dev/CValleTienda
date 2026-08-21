'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Button, LinkButton } from '@/components/ui/Button'
import { VariantesEditor } from './VariantesEditor'
import { ImagenProductoUpload } from './ImagenProductoUpload'
import { subirImagenesTrasAlta } from '@/lib/productos/imagen-api'
import { BarcodeButton } from './BarcodeButton'
import { InlineCreate } from './InlineCreate'
import { useAutoFocus } from '@/lib/hooks/useAutoFocus'
import {
  crearProducto,
  actualizarProducto,
  crearCategoriaInline,
  generarCodigosBarrasBatch,
  type ProductoInput,
  type VarianteInput,
} from '@/app/actions/productos'
import type { KitComponenteState } from './KitComponentesEditor'
import { KitAutoAsignar } from './KitAutoAsignar'
import type { Categoria, Talla, Color } from '@/types/database'
import { useRubro } from '@/components/layout/RubroProvider'
import { TODAS_LAS_UNIDADES, rubroPermiteStockInfinito } from '@/lib/rubro/config'
import { titleCase } from '@/lib/utils/text'
import { Switch } from '@/components/ui/Switch'
import { TramosCantidadEditor } from './TramosCantidadEditor'
import { guardarTramosProducto } from '@/app/actions/tramos-cantidad'
import type { TramoCantidad } from '@/lib/precios/tramos-cantidad'

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
  /** Porcentaje de markup de la configuración de tienda. 0 = sin sugerencia. */
  margenDefault?: number
  initialTramos?: TramoCantidad[]
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
  margenDefault = 0,
  initialTramos = [],
}: ProductoFormProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const nombreRef = useRef<HTMLInputElement>(null)
  useAutoFocus(nombreRef)
  const { rubro, unidadesDisponibles, labelVar1, labelVar2, usarVar2, defaultSinVariantes, usarPedidoCc } = useRubro()
  const permiteStockInfinito = rubroPermiteStockInfinito(rubro)
  const unidadesOpciones = TODAS_LAS_UNIDADES.filter((u) => unidadesDisponibles.includes(u.value))

  // Categorías con soporte de creación inline
  const [categoriasLocales, setCategoriasLocales] = useState<Categoria[]>(categoriasProp)

  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? '')
  const [codigoBase, setCodigoBase] = useState(initial?.codigo_base ?? '')
  const [categoriaId, setCategoriaId] = useState<string>(initial?.categoria_id ?? '')
  const [precioCompra, setPrecioCompra] = useState<number>(initial?.precio_compra ?? 0)
  const [precioVenta, setPrecioVenta] = useState<number>(initial?.precio_venta ?? 0)
  const [recargoCcPct, setRecargoCcPct] = useState<string>(
    initial?.recargo_cc_pct != null ? String(initial.recargo_cc_pct) : ''
  )
  // false = precio venta se puede auto-sugerir; true = el usuario lo editó a mano
  const [precioVentaManual, setPrecioVentaManual] = useState<boolean>(
    modo === 'editar' ? true : (initial?.precio_venta ?? 0) > 0
  )
  const [visibleEnCatalogo, setVisibleEnCatalogo] = useState<boolean>(
    initial?.visible_en_catalogo ?? false
  )
  const [tramos, setTramos] = useState<TramoCantidad[]>(initialTramos)

  function calcularPrecioSugerido(compra: number): number {
    if (!margenDefault || margenDefault <= 0 || !compra) return 0
    return Math.round(compra * (1 + margenDefault / 100))
  }
  const [unidadMedida, setUnidadMedida] = useState<string>(initial?.unidad_de_medida ?? 'unidad')
  const [imagenUrl, setImagenUrl] = useState(initial?.imagen_url ?? '')
  const [filePendiente, setFilePendiente] = useState<File | null>(null)
  const [filesColorPendientes, setFilesColorPendientes] = useState<Record<string, File>>({})
  const [fotosKey, setFotosKey] = useState(0)
  const [mostrarDetalles, setMostrarDetalles] = useState(false)
  const saveAndNewRef = useRef(false)

  const mostrarUnidadMedida = unidadesOpciones.length > 1

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
  const [autoGenerarCodigos, setAutoGenerarCodigos] = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      setMostrarDetalles(localStorage.getItem('cvalle:form-detalles') === 'true')
      setAutoGenerarCodigos(localStorage.getItem('cvalle:auto-codigos') === 'true')
      if (modo === 'crear' && !initial?.categoria_id) {
        const saved = localStorage.getItem('cvalle:ultima-categoria')
        if (saved) setCategoriaId(saved)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Kit
  const [esKit, setEsKit] = useState<boolean>(initial?.es_kit ?? initialEsKit)
  const [kitCompsPorVariante, setKitCompsPorVariante] = useState<Record<string, KitComponenteState[]>>(
    initialKitComponentes ?? {}
  )

  function handleCategoriaChange(id: string) {
    setCategoriaId(id)
    if (modo === 'crear' && id) {
      localStorage.setItem('cvalle:ultima-categoria', id)
    }
  }

  function resetForm() {
    setNombre('')
    setDescripcion('')
    setCodigoBase('')
    setPrecioCompra(0)
    setPrecioVenta(0)
    setPrecioVentaManual(false)
    setImagenUrl('')
    setFilePendiente(null)
    setFilesColorPendientes({})
    setFotosKey((k) => k + 1)
    setSimpleCodigoBarras('')
    setSimpleStock(0)
    setSimpleStockMinimo(0)
    setVariantes([])
    setEsKit(false)
    setVisibleEnCatalogo(false)
    setTramos([])
    setKitCompsPorVariante({})
    setTimeout(() => nombreRef.current?.focus(), 50)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const esNuevo = saveAndNewRef.current
    saveAndNewRef.current = false

    // Validar código de barras obligatorio
    if (!tieneVariantes && !simpleCodigoBarras.trim()) {
      setError('El código de barras es obligatorio. Generalo o escanealo antes de guardar.')
      return
    }
    if (tieneVariantes) {
      const sinCodigo = variantes.filter((v) => !v.eliminar && !v.codigo_barras?.trim())
      if (sinCodigo.length > 0 && !autoGenerarCodigos) {
        setError('Todas las variantes deben tener código de barras antes de guardar.')
        return
      }
    }

    startTransition(async () => {
      const variantesParaEnviar: VarianteInput[] = tieneVariantes
        ? [...variantes]
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

      if (tieneVariantes && autoGenerarCodigos) {
        const sinCodigoIdx = variantesParaEnviar
          .map((v, i) => (!v.eliminar && !v.codigo_barras?.trim() ? i : -1))
          .filter((i) => i >= 0)
        if (sinCodigoIdx.length > 0) {
          const res = await generarCodigosBarrasBatch(sinCodigoIdx.length)
          if (!res.ok || !res.data) {
            setError(res.error ?? 'No se pudieron generar los códigos automáticamente')
            return
          }
          let codIdx = 0
          for (const i of sinCodigoIdx) {
            variantesParaEnviar[i] = {
              ...variantesParaEnviar[i],
              codigo_barras: res.data.codigos[codIdx++],
            }
          }
        }
      }

      const input: ProductoInput = {
        nombre,
        descripcion: descripcion || null,
        codigo_base: codigoBase || null,
        categoria_id: categoriaId || null,
        precio_compra: Number(precioCompra) || 0,
        precio_venta: Number(precioVenta) || 0,
        recargo_cc_pct: recargoCcPct === '' ? null : Math.max(0, Number(recargoCcPct) || 0),
        unidad_de_medida: unidadMedida || 'unidad',
        imagen_url: imagenUrl.startsWith('http') ? imagenUrl : null,
        variantes: variantesParaEnviar,
        es_kit: esKit,
        visible_en_catalogo: esKit ? false : visibleEnCatalogo,
        kit_componentes_por_variante: esKit ? kitCompsPorVariante : undefined,
      }

      const res =
        modo === 'crear'
          ? await crearProducto(input)
          : await actualizarProducto(productoId!, input)
      if (!res.ok) {
        setError(res.error ?? 'Error desconocido')
        return
      }
      const idGuardado =
        modo === 'crear' && res.data && typeof res.data === 'object' && 'id' in res.data
          ? (res.data as { id: string }).id
          : productoId
      if (idGuardado) {
        const tramosRes = await guardarTramosProducto(
          idGuardado,
          tramos.filter((t) => Number(t.cantidad_desde) > 0)
        )
        if (!tramosRes.ok) {
          setError(tramosRes.error ?? 'El producto se guardó pero los tramos no')
          return
        }
      }
      if (modo === 'crear' && res.data && typeof res.data === 'object' && 'id' in res.data) {
        const nuevoId = (res.data as { id: string }).id
        const imgErr = await subirImagenesTrasAlta(nuevoId, {
          cover: filePendiente,
          porColor: filesColorPendientes,
        })
        if (imgErr) {
          toast.warning(`Producto creado, pero la foto no se subió: ${imgErr}. Podés cargarla al editar.`)
        }
        if (esNuevo) {
          toast.success(`"${nombre}" guardado. Cargá el siguiente.`)
          resetForm()
        } else {
          toast.success('Producto creado exitosamente')
          router.push(`/productos/${nuevoId}`)
        }
      } else {
        toast.success('Cambios guardados')
        router.push('/productos')
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Segmented control: simple vs variantes — solo en crear */}
      {modo === 'crear' && (
        <div className="flex gap-1 p-1 bg-surface-sunken rounded-[var(--radius-lg)] w-fit">
          <button
            type="button"
            onClick={() => setTieneVariantes(false)}
            className={`px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-all ${
              !tieneVariantes
                ? 'bg-surface shadow-sm text-fg'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            Producto simple
          </button>
          <button
            type="button"
            onClick={() => setTieneVariantes(true)}
            className={`px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium transition-all ${
              tieneVariantes
                ? 'bg-surface shadow-sm text-fg'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            Con variantes
            <span className="ml-1.5 text-[11px] text-fg-subtle">
              {usarVar2 ? `(${labelVar1} × ${labelVar2})` : `(${labelVar1})`}
            </span>
          </button>
        </div>
      )}

      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-5 space-y-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.10em] text-fg-subtle">Información del producto</h2>

        <ImagenProductoUpload
          key={`cover-${fotosKey}`}
          etiqueta="Foto principal"
          productoId={modo === 'editar' ? productoId ?? null : null}
          imagenUrl={imagenUrl || null}
          onUrlChange={(url) => setImagenUrl(url ?? '')}
          onFilePendienteChange={modo === 'crear' ? setFilePendiente : undefined}
        />

        {!esKit && (
          <Switch
            checked={visibleEnCatalogo}
            onChange={setVisibleEnCatalogo}
            label="Mostrar en catálogo público"
            description="Apagado por defecto. Solo los productos marcados aparecen en el link que compartís."
          />
        )}

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
              onChange={(e) => handleCategoriaChange(e.target.value)}
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
                transform={titleCase}
                onConfirm={async (nombre) => {
                  const res = await crearCategoriaInline(nombre)
                  if (!res.ok || !res.data) return null
                  return res.data
                }}
                onCreated={(item) => {
                  setCategoriasLocales((prev) => [...prev, { id: item.id, nombre: item.nombre, tienda_id: '', descripcion: null, activo: true, created_at: '', updated_at: '' }])
                  handleCategoriaChange(item.id)
                }}
              />
            </div>
          </div>
          <Input
            label="Precio compra"
            type="number"
            step="0.01"
            min="0"
            value={precioCompra || ''}
            placeholder="0"
            onChange={(e) => {
              const compra = e.target.value === '' ? 0 : Number(e.target.value)
              setPrecioCompra(compra)
              if (!precioVentaManual && margenDefault > 0) {
                setPrecioVenta(calcularPrecioSugerido(compra))
              }
            }}
          />
          <div>
            <div className="flex items-end gap-1.5">
              <div className="flex-1">
                <Input
                  label="Precio venta *"
                  type="number"
                  step="0.01"
                  min="0"
                  value={precioVenta}
                  onChange={(e) => {
                    setPrecioVentaManual(true)
                    setPrecioVenta(Number(e.target.value))
                  }}
                  required
                />
              </div>
              {margenDefault > 0 && precioCompra > 0 && (
                <button
                  type="button"
                  title={precioVentaManual ? `Recalcular con ${margenDefault}% de markup` : `Sugerencia aplicada (${margenDefault}%)`}
                  onClick={() => {
                    setPrecioVenta(calcularPrecioSugerido(precioCompra))
                    setPrecioVentaManual(false)
                  }}
                  disabled={!precioVentaManual}
                  className={`mb-0 h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-[var(--radius-md)] border transition-colors ${
                    precioVentaManual
                      ? 'border-primary-border text-fg-brand hover:bg-primary-soft'
                      : 'border-border-subtle text-fg-subtle cursor-default'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                  </svg>
                </button>
              )}
            </div>
            {precioCompra > 0 && precioVenta > 0 && (() => {
              const margenReal = ((precioVenta - precioCompra) / precioCompra) * 100
              const ganancia = precioVenta - precioCompra
              let colorClass = 'text-fg-subtle'
              let prefijo = ''
              if (margenReal < 0) { colorClass = 'text-danger-soft-fg'; prefijo = '⚠️ ' }
              else if (margenReal < 10) { colorClass = 'text-amber-600'; prefijo = '⚡ ' }
              else if (margenReal >= 20) { colorClass = 'text-fg-brand'; prefijo = '✓ ' }
              return (
                <p className={`mt-1 text-[11px] ${colorClass}`}>
                  {prefijo}Ganancia: {margenReal >= 0 ? '+' : ''}{margenReal.toFixed(1)}% — ${Math.round(ganancia).toLocaleString('es-AR')} por unidad
                  {!precioVentaManual && margenDefault > 0 && margenReal >= 0 && (
                    <span className="ml-1 text-fg-subtle">• sugerido</span>
                  )}
                </p>
              )
            })()}
            {usarPedidoCc && (
              <div className="mt-3">
                <Input
                  label="Recargo cuenta (%)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={recargoCcPct}
                  onChange={(e) => setRecargoCcPct(e.target.value)}
                  placeholder="Vacío = default de la tienda"
                  hint={
                    precioVenta > 0 && recargoCcPct !== ''
                      ? `Si paga a cuenta: $${Math.round(precioVenta * (1 + Number(recargoCcPct) / 100)).toLocaleString('es-AR')}`
                      : 'Vacío usa el recargo default de Configuración.'
                  }
                />
              </div>
            )}
            <div className="mt-4">
              <TramosCantidadEditor value={tramos} onChange={setTramos} />
            </div>
          </div>
        </div>

        {/* Modo simple inline: código barras + stock (solo en crear sin variantes) */}
        {modo === 'crear' && !tieneVariantes && (
          <div className="pt-4 border-t border-border-subtle grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Input
                label="Código de barras *"
                value={simpleCodigoBarras}
                onChange={(e) => setSimpleCodigoBarras(e.target.value)}
                placeholder="Escanear o ingresar"
                required
              />
              <BarcodeButton onGenerated={(codigo) => setSimpleCodigoBarras(codigo)} />
            </div>
            <Input
              label={permiteStockInfinito ? 'Stock inicial (−1 = ilimitado)' : 'Stock inicial'}
              type="number"
              min={permiteStockInfinito ? -1 : 0}
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

        {/* Más detalles: código base, unidad, descripción */}
        <div>
          <button
            type="button"
            onClick={() => {
              const next = !mostrarDetalles
              setMostrarDetalles(next)
              localStorage.setItem('cvalle:form-detalles', String(next))
            }}
            className="mt-1 flex items-center gap-2 px-3 py-2 text-sm font-medium text-fg-muted bg-surface-sunken border border-border-default rounded-[var(--radius-md)] hover:border-primary-border hover:text-fg-brand hover:bg-primary-soft transition-all"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14" height="14"
              viewBox="0 0 24 24"
              fill="none" stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform duration-200 ${mostrarDetalles ? 'rotate-180' : ''}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {mostrarDetalles ? 'Menos detalles' : 'Más detalles'}
          </button>
          {mostrarDetalles && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border-subtle">
              <Input
                label="Código base (interno)"
                value={codigoBase}
                onChange={(e) => setCodigoBase(e.target.value)}
                placeholder="Opcional, ej: REM-001"
              />
              {mostrarUnidadMedida && (
                <Select
                  label="Unidad de medida"
                  value={unidadMedida}
                  onChange={(e) => setUnidadMedida(e.target.value)}
                >
                  {unidadesOpciones.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </Select>
              )}
              <div className={mostrarUnidadMedida ? '' : 'md:col-span-2'}>
                <Textarea
                  label="Descripción"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toggle Kit/Armado — solo en edición y solo para ropa */}
      {modo === 'editar' && rubro === 'ropa' && (
        <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-fg">¿Es un kit / armado?</p>
              <p className="text-xs text-fg-subtle mt-0.5">
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
                className={`inline-block h-4 w-4 rounded-full bg-surface shadow transition-transform ${
                  esKit ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {esKit && (
            <p className="mt-2 text-xs text-purple-600 bg-info-soft rounded-[var(--radius-md)] px-3 py-2">
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
        <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-5 space-y-4">
          {tieneVariantes && modo === 'crear' && (
            <label className="flex items-start gap-2 text-sm text-fg cursor-pointer">
              <input
                type="checkbox"
                checked={autoGenerarCodigos}
                onChange={(e) => {
                  const checked = e.target.checked
                  setAutoGenerarCodigos(checked)
                  localStorage.setItem('cvalle:auto-codigos', String(checked))
                }}
                className="mt-0.5 rounded border-border-strong text-fg-brand focus:ring-primary/40"
              />
              <span>
                Generar códigos EAN-13 automáticamente si faltan al guardar
                <span className="block text-xs text-fg-muted mt-0.5">
                  Útil para carga masiva; el POS necesita código en cada variante.
                </span>
              </span>
            </label>
          )}
          <VariantesEditor
            key={`vars-${fotosKey}`}
            tallas={tallas}
            colores={colores}
            initial={initialVars.length > 0 ? initialVars : undefined}
            onChange={setVariantes}
            modoEdicion={modo === 'editar'}
            esKit={esKit}
            initialKitComponentes={initialKitComponentes}
            onKitComponentesChange={setKitCompsPorVariante}
            productoId={modo === 'editar' ? productoId : undefined}
            precioProducto={Number(precioVenta) || null}
            onColorFilePendienteChange={(colorId, file) => {
              setFilesColorPendientes((prev) => {
                const next = { ...prev }
                if (file) next[colorId] = file
                else delete next[colorId]
                return next
              })
            }}
          />
        </div>
      )}

      {error && (
        <div className="bg-danger-soft border border-danger-border text-danger-soft-fg rounded-[var(--radius-md)] px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <LinkButton href="/productos" variant="ghost">
          Cancelar
        </LinkButton>
        {modo === 'crear' && (
          <Button
            type="submit"
            variant="secondary"
            disabled={pending}
            onClick={() => { saveAndNewRef.current = true }}
          >
            {pending ? '...' : 'Guardar y crear otro'}
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando...' : modo === 'crear' ? 'Crear producto' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
