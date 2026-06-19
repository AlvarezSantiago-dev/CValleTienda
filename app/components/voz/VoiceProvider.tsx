'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'
import type { VozContextValue, VozPaso, ProductoDraft, DatosVoz, OpcionVoz, VarianteDraft } from '@/lib/voz/tipos'
import { parsearComandoNav, esComandoProducto } from '@/lib/voz/comandos'
import { parsearNumero } from '@/lib/voz/numeros'
import { parsearUnidad } from '@/lib/voz/unidades'
import { parsearCodigoBarras } from '@/lib/voz/barras'
import {
  obtenerDatosParaVoz,
  crearProducto,
  crearCategoriaInline,
} from '@/app/actions/productos'
import type { VarianteInput } from '@/app/actions/productos'
import { useRubro } from '@/components/layout/RubroProvider'
import type { ConfigRubro } from '@/lib/rubro/config'

// ------------------------------------------------------------------
// Detección de soporte
// ------------------------------------------------------------------
function getSpeechRecognitionClass(): typeof SpeechRecognition | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

// ------------------------------------------------------------------
// Helpers puros — fuera del componente para no recrearlos
// ------------------------------------------------------------------

/** Genera el texto de la pregunta para el HUD según paso, rubro y draft */
function generarPregunta(
  paso: VozPaso,
  config: ConfigRubro,
  datos: DatosVoz | null,
  draft: ProductoDraft
): string {
  switch (paso) {
    case 'escuchando_nav':
      return '¿A dónde querés ir? (ej: "ir a productos")'
    case 'producto_nombre':
      return '¿Cómo se llama el producto?'
    case 'producto_codigo_barras':
      return '¿Tiene código de barras? Dictalo o decí "omitir"'
    case 'producto_precio_venta':
      return '¿Cuál es el precio de venta? (escribí el número)'
    case 'producto_precio_compra':
      return '¿Cuál es el precio de compra? (opcional)'
    case 'producto_unidad': {
      const opts = config.unidadesDisponibles.join(' / ')
      return `¿En qué unidad se vende? (${opts})`
    }
    case 'producto_categoria': {
      const cats = datos?.categorias ?? []
      const ejs = cats
        .slice(0, 3)
        .map((c) => c.nombre)
        .join(', ')
      return ejs
        ? `¿Categoría? (ej: ${ejs} — o "ninguna")`
        : '¿Categoría? (o "ninguna" para omitir)'
    }
    case 'producto_categoria_crear':
      return `No encontré "${draft.categoriaPendienteCrear ?? '…'}". ¿La creo como nueva categoría? (sí / no)`
    case 'producto_variantes_yn':
      return `¿El producto tiene ${config.labelVar1.toLowerCase()}s? (sí o no)`
    case 'producto_variantes':
      return `Seleccioná los ${config.labelVar1.toLowerCase()}s tocando las opciones`
    case 'producto_variantes_color_yn':
      return `¿Las variantes tienen ${config.labelVar2.toLowerCase()}es distintos? (sí o no)`
    case 'producto_variantes_color':
      return `Seleccioná los ${config.labelVar2.toLowerCase()}es tocando las opciones`
    case 'producto_variantes_stock':
      return '¿Cuántas unidades por variante?'
    case 'producto_stock_simple':
      return '¿Cuántas unidades tenés en stock?'
    case 'producto_stock_minimo':
      return '¿Cuál es el stock mínimo para alertas? (o "omitir")'
    case 'producto_descripcion':
      return '¿Querés agregar una descripción? (o "omitir")'
    case 'producto_confirmar':
      return '¿Todo correcto? Decí "confirmar" o "cancelar"'
    case 'producto_guardando':
      return 'Guardando...'
    case 'producto_listo':
      return '¡Producto guardado!'
    case 'producto_error':
      return 'Ocurrió un error al guardar.'
    default:
      return ''
  }
}

/**
 * Calcula el siguiente paso según rubro y draft.
 * Función pura — sin acceso al estado React.
 */
function calcularSiguientePaso(
  pasoActual: VozPaso,
  nuevoDraft: ProductoDraft,
  config: ConfigRubro,
  datos: DatosVoz
): VozPaso {
  switch (pasoActual) {
    case 'producto_nombre':
      return 'producto_codigo_barras'
    case 'producto_codigo_barras':
      return 'producto_precio_venta'
    case 'producto_precio_venta':
      return 'producto_precio_compra'
    case 'producto_precio_compra':
      return config.unidadesDisponibles.length > 1 ? 'producto_unidad' : 'producto_categoria'
    case 'producto_unidad':
      return 'producto_categoria'
    case 'producto_categoria':
    case 'producto_categoria_crear':
      if (config.usarVar1 && datos.tallas.length > 0) return 'producto_variantes_yn'
      return 'producto_stock_simple'
    case 'producto_variantes_yn':
      return nuevoDraft.tieneVariantes ? 'producto_variantes' : 'producto_stock_simple'
    case 'producto_variantes':
      return config.usarVar2 && datos.colores.length > 0
        ? 'producto_variantes_color_yn'
        : 'producto_variantes_stock'
    case 'producto_variantes_color_yn':
      // El handler directo maneja la rama; calcularSiguientePaso usa colorSeleccion como señal
      return nuevoDraft.colorSeleccion !== undefined
        ? 'producto_variantes_stock'
        : 'producto_variantes_color'
    case 'producto_variantes_color':
      return 'producto_variantes_stock'
    case 'producto_variantes_stock':
      return 'producto_stock_minimo'
    case 'producto_stock_simple':
      return 'producto_stock_minimo'
    case 'producto_stock_minimo':
      return 'producto_descripcion'
    case 'producto_descripcion':
      return 'producto_confirmar'
    default:
      return 'producto_confirmar'
  }
}

/**
 * Calcula las opciones clickeables para el paso actual.
 * Permite al usuario tocar una opción en vez de hablarla.
 */
function calcularOpciones(
  paso: VozPaso,
  config: ConfigRubro,
  datos: DatosVoz
): OpcionVoz[] {
  switch (paso) {
    case 'producto_codigo_barras':
      return [{ label: 'Omitir código', valor: 'omitir' }]

    case 'producto_precio_compra':
      return [{ label: 'Sin precio de compra', valor: 'omitir' }]

    case 'producto_unidad':
      return config.unidadesDisponibles.map((u) => ({ label: u, valor: u }))

    case 'producto_categoria':
      return [
        ...datos.categorias.map((c) => ({ label: c.nombre, valor: c.nombre })),
        { label: '＋ Sin categoría', valor: 'ninguna' },
      ]

    case 'producto_categoria_crear':
      return [
        { label: 'Sí, crear', valor: 'sí' },
        { label: 'No, omitir', valor: 'no' },
      ]

    case 'producto_variantes_yn':
      return [
        { label: `Sí, tiene ${config.labelVar1.toLowerCase()}s`, valor: 'sí' },
        { label: 'No tiene', valor: 'no' },
      ]

    case 'producto_variantes':
      // Multi-select: devuelve las tallas disponibles como chips
      return datos.tallas.map((t) => ({ label: t.nombre, valor: t.nombre }))

    case 'producto_variantes_color_yn':
      return [
        { label: `Sí, ${config.labelVar2.toLowerCase()}es distintos`, valor: 'sí' },
        { label: 'No, todas iguales', valor: 'no' },
      ]

    case 'producto_variantes_color':
      // Multi-select: devuelve los colores disponibles como chips
      return datos.colores.map((c) => ({
        label: c.nombre,
        valor: c.nombre,
        sublabel: c.hex_color ?? undefined,
      }))

    case 'producto_variantes_stock':
      return [
        { label: '1', valor: '1' },
        { label: '5', valor: '5' },
        { label: '10', valor: '10' },
        { label: '20', valor: '20' },
        { label: '50', valor: '50' },
      ]

    case 'producto_stock_simple':
      return [
        { label: '0', valor: '0' },
        { label: '1', valor: '1' },
        { label: '5', valor: '5' },
        { label: '10', valor: '10' },
        { label: '20', valor: '20' },
        { label: '50', valor: '50' },
      ]

    case 'producto_stock_minimo':
      return [{ label: 'Omitir', valor: 'omitir' }]

    case 'producto_descripcion':
      return [{ label: 'Omitir descripción', valor: 'omitir' }]

    case 'producto_confirmar':
      return [
        { label: '✓ Confirmar', valor: 'confirmar' },
        { label: '✗ Cancelar', valor: 'cancelar' },
      ]

    default:
      return []
  }
}

const PASOS_SIN_ESCUCHA: VozPaso[] = [
  'inactivo',
  'producto_guardando',
  'producto_listo',
  'producto_error',
  // Pasos de multi-select chip (sin voz, solo toque)
  'producto_variantes',
  'producto_variantes_color',
  // Precios: input numérico — voz no confiable para números grandes en Chrome
  'producto_precio_venta',
  'producto_precio_compra',
]

// ------------------------------------------------------------------
// Helper puro — genera variantes cartesianas (tallas × colores)
// ------------------------------------------------------------------
function generarVariantesCartesianas(
  tallaSeleccion: { id: string; nombre: string }[],
  colorSeleccion: { id: string; nombre: string; hex: string | null }[],
  stockDefault: number
): VarianteDraft[] {
  if (colorSeleccion.length === 0) {
    return tallaSeleccion.map((t) => ({
      label: t.nombre,
      tallaId: t.id,
      colorId: null,
      colorLabel: null,
      stock: stockDefault,
      stockMinimo: 0,
    }))
  }
  const result: VarianteDraft[] = []
  for (const talla of tallaSeleccion) {
    for (const color of colorSeleccion) {
      result.push({
        label: `${talla.nombre} / ${color.nombre}`,
        tallaId: talla.id,
        colorId: color.id,
        colorLabel: color.nombre,
        stock: stockDefault,
        stockMinimo: 0,
      })
    }
  }
  return result
}

// ------------------------------------------------------------------
// Context
// ------------------------------------------------------------------
const VozContext = createContext<VozContextValue | null>(null)

export function useVoz(): VozContextValue {
  const ctx = useContext(VozContext)
  if (!ctx) throw new Error('useVoz must be used inside VoiceProvider')
  return ctx
}

// ------------------------------------------------------------------
// Provider
// ------------------------------------------------------------------
export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const rubroConfig = useRubro()

  // Ref para acceso sin stale closure en los callbacks
  const rubroConfigRef = useRef<ConfigRubro>(rubroConfig)

  const [paso, setPaso] = useState<VozPaso>('inactivo')
  const [draft, setDraft] = useState<ProductoDraft>({})
  const [textoInterim, setTextoInterim] = useState('')
  const [textoFinal, setTextoFinal] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [soportado, setSoportado] = useState(false)
  const [preguntaActual, setPreguntaActual] = useState('')
  const [opcionesActuales, setOpcionesActuales] = useState<OpcionVoz[]>([])
  const [seleccionMultiple, setSeleccionMultiple] = useState<string[]>([])

  const pasoRef = useRef<VozPaso>('inactivo')
  const draftRef = useRef<ProductoDraft>({})
  const datosVozRef = useRef<DatosVoz | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const intentosPrecioRef = useRef(0)
  const intentosUnidadRef = useRef(0)
  const seleccionMultipleRef = useRef<string[]>([])

  useEffect(() => {
    rubroConfigRef.current = rubroConfig
    pasoRef.current = paso
    draftRef.current = draft
  })

  // Speech API solo existe en el browser; detectar tras hidratación para evitar mismatch SSR
  useEffect(() => {
    queueMicrotask(() => {
      setSoportado(getSpeechRecognitionClass() !== null)
    })
  }, [])

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null
      recognitionRef.current.onerror = null
      recognitionRef.current.onend = null
      try { recognitionRef.current.abort() } catch { /* ignore */ }
      recognitionRef.current = null
    }
  }, [])

  const irAPaso = useCallback(
    (nuevoPaso: VozPaso, nuevoDraft?: ProductoDraft) => {
      stopRecognition()
      const config = rubroConfigRef.current
      const datos = datosVozRef.current ?? { tallas: [], colores: [], categorias: [] }
      const finalDraft = nuevoDraft ?? draftRef.current

      if (nuevoDraft !== undefined) {
        setDraft(nuevoDraft)
        draftRef.current = nuevoDraft
      }

      setPaso(nuevoPaso)
      pasoRef.current = nuevoPaso
      setTextoInterim('')
      setTextoFinal('')
      setError(null)
      setPreguntaActual(generarPregunta(nuevoPaso, config, datos, finalDraft))
      setOpcionesActuales(calcularOpciones(nuevoPaso, config, datos))
      // Resetear multi-select al cambiar de paso
      seleccionMultipleRef.current = []
      setSeleccionMultiple([])
    },
    [stopRecognition]
  )

  // ------------------------------------------------------------------
  // Guardar producto — definido ANTES de procesarUtterance para que
  // el closure lo capture correctamente
  // ------------------------------------------------------------------
  const confirmarProductoInterno = useCallback(async () => {
    const d = draftRef.current
    const config = rubroConfigRef.current
    if (!d.nombre || d.precioVenta === undefined) return

    irAPaso('producto_guardando')

    let variantes: VarianteInput[]
    if (d.tieneVariantes && d.variantes?.length) {
      variantes = d.variantes.map((v) => ({
        talla_id: v.tallaId,
        color_id: v.colorId ?? null,
        codigo_barras: null,
        precio_venta: null,
        stock_inicial: v.stock,
        stock_minimo: v.stockMinimo ?? 0,
      }))
    } else {
      variantes = [
        {
          talla_id: null,
          color_id: null,
          codigo_barras: d.codigoBarras ?? null,
          precio_venta: null,
          stock_inicial: d.stockSimple ?? 0,
          stock_minimo: d.stockMinimo ?? 0,
        },
      ]
    }

    const unidad = d.unidadMedida ?? config.unidadesDisponibles[0] ?? 'unidad'

    const result = await crearProducto({
      nombre: d.nombre,
      descripcion: d.descripcion ?? null,
      codigo_base: d.codigoBarras ?? null,
      categoria_id: d.categoriaId ?? null,
      precio_compra: d.precioCompra ?? 0,
      precio_venta: d.precioVenta,
      unidad_de_medida: unidad,
      imagen_url: null,
      variantes,
    })

    if (result.ok) {
      irAPaso('producto_listo', {})
      setTimeout(() => irAPaso('inactivo', {}), 3000)
    } else {
      setPaso('producto_error')
      pasoRef.current = 'producto_error'
      setError(result.error ?? 'Error desconocido')
    }
  }, [irAPaso])

  // ------------------------------------------------------------------
  // Procesamiento de cada utterance — máquina de estados
  // ------------------------------------------------------------------
  const procesarUtterance = useCallback(
    async (transcript: string) => {
      const p = pasoRef.current
      const d = { ...draftRef.current }
      const config = rubroConfigRef.current
      const datos = datosVozRef.current ?? { tallas: [], colores: [], categorias: [] }

      setTextoFinal(transcript)

      // ----------------------------------------------------------------
      // Modo navegación
      // ----------------------------------------------------------------
      if (p === 'escuchando_nav') {
        if (esComandoProducto(transcript)) {
          if (!datosVozRef.current) {
            try {
              datosVozRef.current = await obtenerDatosParaVoz()
            } catch {
              datosVozRef.current = { tallas: [], colores: [], categorias: [] }
            }
          }
          irAPaso('producto_nombre', {})
          return
        }
        const ruta = parsearComandoNav(transcript)
        irAPaso('inactivo')
        if (ruta) router.push(ruta)
        return
      }

      // ----------------------------------------------------------------
      // Flujo de producto
      // ----------------------------------------------------------------

      if (p === 'producto_nombre') {
        const nombre = transcript.trim()
        if (!nombre) return
        const nuevo = { ...d, nombre }
        irAPaso(calcularSiguientePaso(p, nuevo, config, datos), nuevo)
        return
      }

      if (p === 'producto_codigo_barras') {
        const lower = transcript.toLowerCase()
        const skip = /omitir|no|sin c[oó]digo|sin barras?/.test(lower)
        if (skip) {
          const nuevo = { ...d, codigoBarras: null }
          irAPaso(calcularSiguientePaso(p, nuevo, config, datos), nuevo)
          return
        }
        const codigo = parsearCodigoBarras(transcript)
        if (codigo) {
          const nuevo = { ...d, codigoBarras: codigo }
          irAPaso(calcularSiguientePaso(p, nuevo, config, datos), nuevo)
        } else {
          // No se pudo parsear → omitir y avanzar
          const nuevo = { ...d, codigoBarras: null }
          irAPaso(calcularSiguientePaso(p, nuevo, config, datos), nuevo)
        }
        return
      }

      if (p === 'producto_precio_venta') {
        const precio = parsearNumero(transcript)
        if (precio === null || precio <= 0) {
          intentosPrecioRef.current++
          if (intentosPrecioRef.current >= 2) {
            irAPaso('inactivo', {})
            setError('No se pudo interpretar el precio. Podés cargarlo manualmente.')
          }
          return
        }
        intentosPrecioRef.current = 0
        const nuevo = { ...d, precioVenta: precio }
        irAPaso(calcularSiguientePaso(p, nuevo, config, datos), nuevo)
        return
      }

      if (p === 'producto_precio_compra') {
        const lower = transcript.toLowerCase()
        const skip = /omitir|cero|sin costo|gratis/.test(lower)
        const valor = skip ? 0 : (parsearNumero(transcript) ?? 0)
        const nuevo = { ...d, precioCompra: valor }
        irAPaso(calcularSiguientePaso(p, nuevo, config, datos), nuevo)
        return
      }

      if (p === 'producto_unidad') {
        const unidad = parsearUnidad(transcript, config.unidadesDisponibles)
        if (!unidad) {
          intentosUnidadRef.current++
          if (intentosUnidadRef.current >= 2) {
            const fallback = config.unidadesDisponibles[0]
            intentosUnidadRef.current = 0
            const nuevo = { ...d, unidadMedida: fallback }
            irAPaso(calcularSiguientePaso(p, nuevo, config, datos), nuevo)
          }
          return
        }
        intentosUnidadRef.current = 0
        const nuevo = { ...d, unidadMedida: unidad }
        irAPaso(calcularSiguientePaso(p, nuevo, config, datos), nuevo)
        return
      }

      if (p === 'producto_categoria') {
        const lower = transcript.toLowerCase()
        const skip = /ninguna|^no\b|saltar|omitir|sin categor/.test(lower)
        if (skip) {
          const nuevo = { ...d, categoriaId: null, categoriaNombre: null }
          irAPaso(calcularSiguientePaso(p, nuevo, config, datos), nuevo)
          return
        }
        const cats = datos.categorias
        const match = cats.find((c) => lower.includes(c.nombre.toLowerCase()))
        if (match) {
          const nuevo = { ...d, categoriaId: match.id, categoriaNombre: match.nombre }
          irAPaso(calcularSiguientePaso(p, nuevo, config, datos), nuevo)
          return
        }
        // Sin match → proponer crear
        const nuevo = { ...d, categoriaPendienteCrear: transcript.trim() }
        irAPaso('producto_categoria_crear', nuevo)
        return
      }

      if (p === 'producto_categoria_crear') {
        const lower = transcript.toLowerCase().trim()
        const esSi = /^s[ií]$|^dale$|^claro$|^crear$|^nueva$/.test(lower)
        const esNo = /^no\b|cancelar|omitir|ninguna/.test(lower)

        if (esSi) {
          const nombre = d.categoriaPendienteCrear?.trim() ?? ''
          if (nombre) {
            const result = await crearCategoriaInline(nombre)
            if (result.ok && result.data) {
              if (datosVozRef.current) {
                datosVozRef.current.categorias.push({
                  id: result.data.id,
                  nombre: result.data.nombre,
                  tienda_id: '',
                  descripcion: null,
                  activo: true,
                  created_at: '',
                  updated_at: '',
                })
              }
              const nuevo = {
                ...d,
                categoriaId: result.data.id,
                categoriaNombre: result.data.nombre,
              }
              const datosFrescos = datosVozRef.current ?? datos
              irAPaso(
                calcularSiguientePaso('producto_categoria', nuevo, config, datosFrescos),
                nuevo
              )
              return
            }
          }
          // Falló — continuar sin categoría
          const nuevo = { ...d, categoriaId: null, categoriaNombre: null }
          irAPaso(calcularSiguientePaso('producto_categoria', nuevo, config, datos), nuevo)
          return
        }

        if (esNo) {
          const nuevo = { ...d, categoriaId: null, categoriaNombre: null }
          irAPaso(calcularSiguientePaso('producto_categoria', nuevo, config, datos), nuevo)
          return
        }
        // Esperar respuesta más clara (sí / no)
        return
      }

      if (p === 'producto_variantes_yn') {
        const lower = transcript.toLowerCase()
        const esSi = /^s[ií]|tiene|con/.test(lower)
        const esNo = /^no\b|sin|ninguna/.test(lower)
        if (esSi) {
          const nuevo = { ...d, tieneVariantes: true }
          irAPaso(calcularSiguientePaso(p, nuevo, config, datos), nuevo)
        } else if (esNo) {
          const nuevo = { ...d, tieneVariantes: false }
          irAPaso(calcularSiguientePaso(p, nuevo, config, datos), nuevo)
        }
        return
      }

      // producto_variantes y producto_variantes_color son pasos multi-select
      // (PASOS_SIN_ESCUCHA) — se manejan con toggleOpcionMulti/confirmarSeleccionMultiple
      // Solo llegan acá si se llama procesarUtterance directamente (vía seleccionarOpcion)
      // → no hay handler de voz aquí

      if (p === 'producto_variantes_color_yn') {
        const lower = transcript.toLowerCase()
        const esSi = /^s[ií]|tienen|con|distintos/.test(lower)
        const esNo = /^no\b|sin|todas|igual/.test(lower)
        if (esSi) {
          irAPaso('producto_variantes_color', d)
        } else if (esNo) {
          irAPaso('producto_variantes_stock', { ...d, colorSeleccion: [] })
        }
        return
      }

      if (p === 'producto_variantes_stock') {
        const stock = parsearNumero(transcript)
        const stockDefault = stock !== null && stock > 0 ? Math.round(stock) : 1
        const variantes = generarVariantesCartesianas(
          d.tallaSeleccion ?? [],
          d.colorSeleccion ?? [],
          stockDefault
        )
        const nuevo = { ...d, variantes }
        irAPaso(calcularSiguientePaso(p, nuevo, config, datos), nuevo)
        return
      }

      if (p === 'producto_stock_simple') {
        const stock = parsearNumero(transcript)
        if (stock === null || stock < 0) return
        const nuevo = { ...d, stockSimple: Math.round(stock) }
        irAPaso(calcularSiguientePaso(p, nuevo, config, datos), nuevo)
        return
      }

      if (p === 'producto_stock_minimo') {
        const lower = transcript.toLowerCase()
        const skip = /omitir|^no\b|cero|ninguno/.test(lower)
        const n = skip ? 0 : (parsearNumero(transcript) ?? 0)
        const nuevo = { ...d, stockMinimo: Math.round(n) }
        irAPaso(calcularSiguientePaso(p, nuevo, config, datos), nuevo)
        return
      }

      if (p === 'producto_descripcion') {
        const lower = transcript.toLowerCase()
        const skip = /omitir|^no\b|sin descripci|nada|ninguna/.test(lower)
        const nuevo = { ...d, descripcion: skip ? null : transcript.trim() }
        irAPaso(calcularSiguientePaso(p, nuevo, config, datos), nuevo)
        return
      }

      if (p === 'producto_confirmar') {
        const lower = transcript.toLowerCase()
        if (/s[ií]|confirmar|guardar|adelante|dale/.test(lower)) {
          confirmarProductoInterno()
        } else if (/^no\b|cancelar|salir/.test(lower)) {
          irAPaso('inactivo', {})
        }
        return
      }
    },
    [irAPaso, router, confirmarProductoInterno]
  )

  // ------------------------------------------------------------------
  // SpeechRecognition — se reinicia en cada cambio de paso
  // ------------------------------------------------------------------
  useEffect(() => {
    if (PASOS_SIN_ESCUCHA.includes(paso)) {
      stopRecognition()
      return
    }

    const SpeechRecognitionClass = getSpeechRecognitionClass()
    if (!SpeechRecognitionClass) return

    const recognition = new SpeechRecognitionClass()
    recognition.lang = 'es-AR'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) final += r[0].transcript
        else interim += r[0].transcript
      }
      setTextoInterim(interim)
      if (final) procesarUtterance(final.trim())
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setPaso('inactivo')
        pasoRef.current = 'inactivo'
        setError('Permiso de micrófono denegado.')
      }
    }

    recognition.onend = () => {
      const cur = pasoRef.current
      if (!PASOS_SIN_ESCUCHA.includes(cur) && recognitionRef.current === recognition) {
        try { recognition.start() } catch { /* ignore race */ }
      }
    }

    recognitionRef.current = recognition
    try { recognition.start() } catch { /* ignore */ }

    return () => {
      if (recognitionRef.current === recognition) {
        recognition.onresult = null
        recognition.onerror = null
        recognition.onend = null
        try { recognition.abort() } catch { /* ignore */ }
        recognitionRef.current = null
      }
    }
  }, [paso, procesarUtterance, stopRecognition])

  // ------------------------------------------------------------------
  // API pública
  // ------------------------------------------------------------------
  const iniciarNav = useCallback(() => {
    irAPaso('escuchando_nav', {})
  }, [irAPaso])

  const iniciarProducto = useCallback(async () => {
    if (!datosVozRef.current) {
      try {
        datosVozRef.current = await obtenerDatosParaVoz()
      } catch {
        datosVozRef.current = { tallas: [], colores: [], categorias: [] }
      }
    }
    intentosPrecioRef.current = 0
    intentosUnidadRef.current = 0
    irAPaso('producto_nombre', {})
  }, [irAPaso])

  const cancelar = useCallback(() => {
    irAPaso('inactivo', {})
  }, [irAPaso])

  const confirmarProducto = useCallback(() => {
    confirmarProductoInterno()
  }, [confirmarProductoInterno])

  const seleccionarOpcion = useCallback(
    (valor: string) => {
      procesarUtterance(valor)
    },
    [procesarUtterance]
  )

  const toggleOpcionMulti = useCallback((valor: string) => {
    const prev = seleccionMultipleRef.current
    const next = prev.includes(valor)
      ? prev.filter((v) => v !== valor)
      : [...prev, valor]
    seleccionMultipleRef.current = next
    setSeleccionMultiple(next)
  }, [])

  const confirmarSeleccionMultiple = useCallback(() => {
    const p = pasoRef.current
    const d = draftRef.current
    const config = rubroConfigRef.current
    const datos = datosVozRef.current ?? { tallas: [], colores: [], categorias: [] }
    const sel = seleccionMultipleRef.current

    if (p === 'producto_variantes') {
      if (sel.length === 0) return
      const tallasSeleccionadas = datos.tallas
        .filter((t) => sel.includes(t.nombre))
        .map((t) => ({ id: t.id, nombre: t.nombre }))
      if (tallasSeleccionadas.length === 0) return
      const nuevo = { ...d, tallaSeleccion: tallasSeleccionadas }
      irAPaso(calcularSiguientePaso(p, nuevo, config, datos), nuevo)
    } else if (p === 'producto_variantes_color') {
      const coloresSeleccionados = datos.colores
        .filter((c) => sel.includes(c.nombre))
        .map((c) => ({ id: c.id, nombre: c.nombre, hex: c.hex_color }))
      const nuevo = { ...d, colorSeleccion: coloresSeleccionados }
      irAPaso(calcularSiguientePaso(p, nuevo, config, datos), nuevo)
    }
  }, [irAPaso])

  return (
    <VozContext.Provider
      value={{
        paso,
        draft,
        textoInterim,
        textoFinal,
        error,
        soportado,
        preguntaActual,
        opcionesActuales,
        esMultiSelect:
          paso === 'producto_variantes' || paso === 'producto_variantes_color',
        seleccionMultiple,
        iniciarNav,
        iniciarProducto,
        cancelar,
        confirmarProducto,
        seleccionarOpcion,
        toggleOpcionMulti,
        confirmarSeleccionMultiple,
      }}
    >
      {children}
    </VozContext.Provider>
  )
}
