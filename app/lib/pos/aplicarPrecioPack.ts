export interface ItemConPack {
  id: string
  variante_id: string
  precio_unitario: number
  cantidad: number
  stock_actual: number
  codigo_barras: string | null
  es_pack?: boolean
  pack_habilitado?: boolean
  pack_cantidad?: number | null
  pack_precio?: number | null
  pack_codigo_barras?: string | null
  pack_automatico?: boolean
  precio_unidad_original?: number
  codigo_unidad?: string | null
  stock_fisico?: number
}

/** Id de carrito a mostrar/editar tras una conversión unidad↔pack. */
export function resolverIdChip(
  items: Array<Pick<ItemConPack, 'id' | 'variante_id' | 'es_pack' | 'pack_automatico'>>,
  varianteId: string
): string {
  const bare = varianteId.replace(/__pack(_auto)?$/, '')
  const remanente = items.find((item) => item.variante_id === bare && !item.es_pack)
  if (remanente) return remanente.id
  const packAuto = items.find((item) => item.variante_id === bare && item.pack_automatico)
  if (packAuto) return packAuto.id
  const pack = items.find((item) => item.variante_id === bare && item.es_pack)
  if (pack) return pack.id
  return bare
}

/**
 * Convierte unidades y packs automáticos de cada variante en:
 * floor(unidades / tamaño) packs + remanente de unidades.
 * Los packs agregados explícitamente mediante su propio código no se modifican.
 */
export function aplicarPrecioPack<T extends ItemConPack>(items: T[]): T[] {
  const procesadas = new Set<string>()
  const resultado: T[] = []

  for (const item of items) {
    const esConvertible =
      (item.pack_automatico || !item.es_pack) &&
      item.pack_habilitado === true &&
      Boolean(item.pack_cantidad && item.pack_cantidad > 1) &&
      Boolean(item.pack_precio && item.pack_precio > 0)

    if (!esConvertible) {
      resultado.push(item)
      continue
    }

    const varianteId = item.variante_id
    if (procesadas.has(varianteId)) continue
    procesadas.add(varianteId)

    const lineas = items.filter(
      (linea) =>
        linea.variante_id === varianteId &&
        (linea.pack_automatico || !linea.es_pack) &&
        linea.pack_habilitado === true
    )
    const packCantidad = Number(item.pack_cantidad)
    const totalFisico = lineas.reduce(
      (total, linea) =>
        total + (linea.pack_automatico ? linea.cantidad * packCantidad : linea.cantidad),
      0
    )
    const cantidadPacks = Math.floor(totalFisico / packCantidad)
    const remanente = Math.round((totalFisico - cantidadPacks * packCantidad) * 1000) / 1000
    const lineaUnidad = lineas.find((linea) => !linea.es_pack) ?? item
    const stockFisico =
      lineaUnidad.stock_fisico ??
      (lineaUnidad.pack_automatico
        ? lineaUnidad.stock_actual * packCantidad
        : lineaUnidad.stock_actual)
    const precioUnidad =
      lineaUnidad.precio_unidad_original ??
      (lineaUnidad.pack_automatico ? 0 : lineaUnidad.precio_unitario)
    const codigoUnidad =
      lineaUnidad.codigo_unidad ??
      (lineaUnidad.pack_automatico ? null : lineaUnidad.codigo_barras)

    if (cantidadPacks > 0) {
      resultado.push({
        ...lineaUnidad,
        id: `${varianteId}__pack_auto`,
        precio_unitario: Number(item.pack_precio),
        cantidad: cantidadPacks,
        stock_actual: Math.floor(stockFisico / packCantidad),
        codigo_barras: item.pack_codigo_barras ?? null,
        es_pack: true,
        pack_automatico: true,
        precio_unidad_original: precioUnidad,
        codigo_unidad: codigoUnidad,
        stock_fisico: stockFisico,
      })
    }

    if (remanente > 0) {
      resultado.push({
        ...lineaUnidad,
        id: varianteId,
        precio_unitario: precioUnidad,
        cantidad: remanente,
        stock_actual: stockFisico,
        codigo_barras: codigoUnidad,
        es_pack: false,
        pack_automatico: false,
        precio_unidad_original: precioUnidad,
        codigo_unidad: codigoUnidad,
        stock_fisico: stockFisico,
      })
    }
  }

  return resultado
}
