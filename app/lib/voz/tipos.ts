import type { Talla, Color, Categoria } from '@/types/database'

export type VozPaso =
  | 'inactivo'
  | 'escuchando_nav'
  // flujo producto
  | 'producto_nombre'
  | 'producto_codigo_barras'
  | 'producto_precio_venta'
  | 'producto_precio_compra'
  | 'producto_unidad'
  | 'producto_categoria'
  | 'producto_categoria_crear'
  | 'producto_variantes_yn'
  | 'producto_variantes'          // multi-select tallas (chips)
  | 'producto_variantes_color_yn' // ¿tienen colores distintos?
  | 'producto_variantes_color'    // multi-select colores (chips)
  | 'producto_variantes_stock'    // stock por defecto para todas las variantes
  | 'producto_stock_simple'
  | 'producto_stock_minimo'
  | 'producto_descripcion'
  | 'producto_confirmar'
  | 'producto_guardando'
  | 'producto_listo'
  | 'producto_error'

export interface VarianteDraft {
  label: string
  tallaId: string | null
  colorId: string | null
  colorLabel: string | null
  stock: number
  stockMinimo: number
}

export interface ProductoDraft {
  nombre?: string
  codigoBarras?: string | null
  precioVenta?: number
  precioCompra?: number
  unidadMedida?: string
  tieneVariantes?: boolean
  /** Tallas seleccionadas en el step multi-select (temporal, se usa para cartesiano) */
  tallaSeleccion?: { id: string; nombre: string }[]
  /** Colores seleccionados en el step multi-select (temporal, se usa para cartesiano) */
  colorSeleccion?: { id: string; nombre: string; hex: string | null }[]
  variantes?: VarianteDraft[]
  stockSimple?: number
  stockMinimo?: number
  categoriaId?: string | null
  categoriaNombre?: string | null
  categoriaPendienteCrear?: string
  descripcion?: string | null
}

export interface DatosVoz {
  tallas: Talla[]
  colores: Color[]
  categorias: Categoria[]
}

/** Opción clickeable que se muestra en el HUD para el paso actual */
export interface OpcionVoz {
  label: string
  valor: string
  /** Texto secundario, ej: código hex de un color */
  sublabel?: string
}

export interface VozContextValue {
  paso: VozPaso
  draft: ProductoDraft
  textoInterim: string
  textoFinal: string
  error: string | null
  soportado: boolean
  preguntaActual: string
  opcionesActuales: OpcionVoz[]
  /** true cuando el paso actual requiere multi-selección de chips */
  esMultiSelect: boolean
  /** chips seleccionados en el paso multi-select actual */
  seleccionMultiple: string[]
  iniciarNav(): void
  iniciarProducto(): void
  cancelar(): void
  confirmarProducto(): void
  seleccionarOpcion(valor: string): void
  /** Alterna un chip en pasos multi-select */
  toggleOpcionMulti(valor: string): void
  /** Confirma la selección multi-select y avanza al siguiente paso */
  confirmarSeleccionMultiple(): void
}
