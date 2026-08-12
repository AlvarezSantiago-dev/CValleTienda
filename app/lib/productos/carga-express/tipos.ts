/** Celda de stock sparsa: una combinación color × talle con cantidad. */
export type CargaExpressCelda = {
  colorNombre: string
  tallaNombre: string
  cantidad: number
}

export type CargaExpressColorEje = {
  nombre: string
  hex?: string | null
}

/** Borrador de carga express (nombres; los ids se resuelven al guardar). */
export type CargaExpressDraft = {
  nombre: string
  descripcion?: string | null
  categoriaNombre?: string | null
  precioCompra: number
  precioVenta: number
  colores: CargaExpressColorEje[]
  tallas: string[]
  celdas: CargaExpressCelda[]
  /** Si true, también crea variantes con cantidad 0. Default false. */
  crearCeldasEnCero?: boolean
  codigoBase?: string | null
  generarBarras: boolean
}

export type ParseWarning = {
  code: 'sin_precio_venta' | 'sin_celdas' | 'sin_nombre' | 'talle_nuevo' | 'color_nuevo' | 'otro'
  message: string
  blocking?: boolean
}

export type ParseResult = {
  draft: CargaExpressDraft
  warnings: ParseWarning[]
  confidence: 'high' | 'medium' | 'low'
}

export type CatalogoParse = {
  colores: { id: string; nombre: string }[]
  tallas: { id: string; nombre: string }[]
  categorias: { id: string; nombre: string }[]
}

export function draftVacio(): CargaExpressDraft {
  return {
    nombre: '',
    descripcion: null,
    categoriaNombre: null,
    precioCompra: 0,
    precioVenta: 0,
    colores: [],
    tallas: [],
    celdas: [],
    crearCeldasEnCero: false,
    codigoBase: null,
    generarBarras: true,
  }
}

export function validarDraft(draft: CargaExpressDraft): string | null {
  if (!draft.nombre?.trim()) return 'El nombre es obligatorio'
  if (!(draft.precioVenta > 0)) return 'El precio de venta debe ser mayor a 0'
  const minQty = draft.crearCeldasEnCero ? 0 : 1
  const validas = draft.celdas.filter((c) => c.cantidad >= minQty && c.colorNombre && c.tallaNombre)
  if (validas.length === 0) {
    return draft.crearCeldasEnCero
      ? 'Agregá al menos una celda color × talle'
      : 'Agregá stock en al menos una celda (cantidad > 0)'
  }
  return null
}
