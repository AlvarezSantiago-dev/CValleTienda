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
  | 'producto_variantes'
  | 'producto_variantes_color'
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
  iniciarNav(): void
  iniciarProducto(): void
  cancelar(): void
  confirmarProducto(): void
  seleccionarOpcion(valor: string): void
}
