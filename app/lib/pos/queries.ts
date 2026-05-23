import { createClient } from '@/lib/supabase/server'

export interface VarianteResultado {
  id: string
  producto_id: string
  producto_nombre: string
  codigo_base: string | null
  codigo_barras: string | null
  talla: string | null
  color: string | null
  color_hex: string | null
  precio_venta: number
  stock_actual: number
  /** Para normales = stock_actual. Para variante-pack = floor(stock_actual / pack_cantidad). Para kits = min(floor(comp.stock / comp.cantidad)) */
  stock_efectivo: number
  /** Si esta entrada es la versión "pack" de una variante */
  es_pack: boolean
  pack_habilitado: boolean
  pack_cantidad: number | null
  pack_precio: number | null
  pack_codigo_barras: string | null
  unidad_de_medida: string
  /** True si el producto es un kit/armado compuesto */
  es_kit: boolean
}

export interface ProductoPOS {
  id: string
  nombre: string
  precio_venta: number
  imagen_url: string | null
  categoria_id: string | null
  categoria_nombre: string | null
  variantes: VarianteResultado[]
}

async function getCtx() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('No autenticado')
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!perfil) throw new Error('Perfil no encontrado')
  return { supabase, tiendaId: perfil.tienda_id as string }
}

const SELECT_VARIANTE =
  'id, producto_id, codigo_barras, precio_venta, stock_actual, activo, ' +
  'pack_habilitado, pack_cantidad, pack_precio, pack_codigo_barras, ' +
  'producto:productos!inner(id, nombre, codigo_base, precio_venta, unidad_de_medida, activo, es_kit), ' +
  'talla:tallas(id, nombre), color:colores(id, nombre, hex_color)'

function mapVariante(raw: Record<string, unknown>): VarianteResultado {
  const producto = (Array.isArray(raw.producto) ? raw.producto[0] : raw.producto) as
    | Record<string, unknown>
    | null
  const talla = (Array.isArray(raw.talla) ? raw.talla[0] : raw.talla) as
    | Record<string, unknown>
    | null
  const color = (Array.isArray(raw.color) ? raw.color[0] : raw.color) as
    | Record<string, unknown>
    | null

  const precioVar = raw.precio_venta != null ? Number(raw.precio_venta) : null
  const precioProd = producto?.precio_venta != null ? Number(producto.precio_venta as number) : 0
  const precio = precioVar != null && precioVar > 0 ? precioVar : precioProd
  const stockActual = Number(raw.stock_actual ?? 0)
  const packHabilitado = (raw.pack_habilitado as boolean) ?? false
  const packCantidad = raw.pack_cantidad != null ? Number(raw.pack_cantidad) : null
  const packPrecio = raw.pack_precio != null ? Number(raw.pack_precio) : null
  const esKit = (producto?.es_kit as boolean) ?? false

  return {
    id: raw.id as string,
    producto_id: raw.producto_id as string,
    producto_nombre: (producto?.nombre as string) ?? 'Producto',
    codigo_base: (producto?.codigo_base as string | null) ?? null,
    codigo_barras: (raw.codigo_barras as string | null) ?? null,
    talla: (talla?.nombre as string | null) ?? null,
    color: (color?.nombre as string | null) ?? null,
    color_hex: (color?.hex_color as string | null) ?? null,
    precio_venta: precio,
    stock_actual: stockActual,
    stock_efectivo: stockActual,  // para kits se recalcula después en enriquecerConStockKit
    es_pack: false,
    pack_habilitado: packHabilitado,
    pack_cantidad: packCantidad,
    pack_precio: packPrecio,
    pack_codigo_barras: (raw.pack_codigo_barras as string | null) ?? null,
    unidad_de_medida: (producto?.unidad_de_medida as string | null) ?? 'unidad',
    es_kit: esKit,
  }
}

/** Genera entradas virtuales "pack" para variantes con pack_habilitado=true */
function generarPackVariantes(variantes: VarianteResultado[]): VarianteResultado[] {
  return variantes
    .filter((v) => v.pack_habilitado && v.pack_cantidad && v.pack_precio)
    .map((v) => ({
      ...v,
      id: v.id + '__pack',
      codigo_barras: v.pack_codigo_barras ?? null,
      precio_venta: v.pack_precio!,
      stock_efectivo: Math.floor(v.stock_actual / v.pack_cantidad!),
      es_pack: true,
    }))
}

/**
 * Para variantes que son kits (es_kit=true), calcula el stock efectivo
 * como min(floor(comp.stock_actual / comp.cantidad)) sobre todos los componentes.
 * Modifica el array in-place.
 */
async function computarStockKits(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  tiendaId: string,
  variantes: VarianteResultado[]
): Promise<void> {
  const kitIds = variantes.filter((v) => v.es_kit).map((v) => v.id)
  if (kitIds.length === 0) return

  const { data: comps } = await supabase
    .from('kit_componentes')
    .select(
      'kit_variante_id, cantidad, ' +
        'comp:variantes_producto!componente_variante_id(stock_actual)'
    )
    .in('kit_variante_id', kitIds)
    .eq('tienda_id', tiendaId)

  const byKit = new Map<string, Array<{ cantidad: number; stock: number }>>()
  for (const row of ((comps ?? []) as unknown as Array<Record<string, unknown>>)) {
    const kitId = row.kit_variante_id as string
    if (!byKit.has(kitId)) byKit.set(kitId, [])
    const comp = (Array.isArray(row.comp) ? row.comp[0] : row.comp) as Record<string, unknown> | null
    byKit.get(kitId)!.push({
      cantidad: Number(row.cantidad),
      stock: Number(comp?.stock_actual ?? 0),
    })
  }

  for (const v of variantes) {
    if (!v.es_kit) continue
    const compList = byKit.get(v.id) ?? []
    if (compList.length === 0) {
      v.stock_efectivo = 0
      continue
    }
    v.stock_efectivo = Math.min(...compList.map((c) => Math.floor(c.stock / c.cantidad)))
  }
}

/**
 * Busca variantes para el POS.
 *
 * - Si el query es un EAN-13 (13 dígitos), se hace match exacto sobre `codigo_barras`.
 * - Si no, se hace ILIKE sobre nombre del producto, código base del producto y código de barras.
 *
 * Retorna variantes activas con stock > 0, más sus packs virtuales.
 * Los kits usan stock efectivo calculado desde componentes.
 */
export async function buscarVariantes(
  query: string,
  limit = 20
): Promise<VarianteResultado[]> {
  const q = query.trim()
  if (!q) return []
  const { supabase, tiendaId } = await getCtx()

  // EAN-13 exacto
  if (/^\d{13}$/.test(q)) {
    // Buscar variante normal (incluye stock=0 para kits)
    const { data } = await supabase
      .from('variantes_producto')
      .select(SELECT_VARIANTE)
      .eq('tienda_id', tiendaId)
      .eq('codigo_barras', q)
      .eq('activo', true)
      .limit(1)

    if (data && (data as unknown[]).length > 0) {
      const variantes = ((data) as unknown as Array<Record<string, unknown>>).map(mapVariante)
      await computarStockKits(supabase, tiendaId, variantes)
      const normalConStock = variantes.filter((v) => !v.es_kit && v.stock_actual > 0)
      const kitsConStock = variantes.filter((v) => v.es_kit && v.stock_efectivo > 0)
      const activos = [...normalConStock, ...kitsConStock]
      const packs = generarPackVariantes(activos.filter((v) => !v.es_kit))
      return [...activos, ...packs].filter((v) => v.stock_efectivo > 0)
    }

    // Intentar con pack_codigo_barras
    const { data: packData } = await supabase
      .from('variantes_producto')
      .select(SELECT_VARIANTE)
      .eq('tienda_id', tiendaId)
      .eq('pack_codigo_barras', q)
      .eq('activo', true)
      .eq('pack_habilitado', true)
      .gt('stock_actual', 0)
      .limit(1)
    if (packData && (packData as unknown[]).length > 0) {
      const variantes = ((packData) as unknown as Array<Record<string, unknown>>).map(mapVariante)
      const packs = generarPackVariantes(variantes)
      return packs.filter((v) => v.stock_efectivo > 0)
    }
    return []
  }

  // Búsqueda parcial (ILIKE)
  const term = q.replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim()
  const pattern = `%${term}%`

  const { data: prodIdsRaw } = await supabase
    .from('productos')
    .select('id')
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .or(`nombre.ilike.${pattern},codigo_base.ilike.${pattern}`)
    .limit(50)

  const prodIds = ((prodIdsRaw ?? []) as Array<{ id: string }>).map((p) => p.id)

  // Variantes normales (stock > 0)
  const { data: porBarcode } = await supabase
    .from('variantes_producto')
    .select(SELECT_VARIANTE)
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .gt('stock_actual', 0)
    .ilike('codigo_barras', pattern)
    .limit(limit)

  let porProductoNormal: Array<Record<string, unknown>> = []
  let porProductoKit: Array<Record<string, unknown>> = []
  if (prodIds.length > 0) {
    // Variantes de productos normales (con stock > 0)
    const { data: dataNormal } = await supabase
      .from('variantes_producto')
      .select(SELECT_VARIANTE)
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .gt('stock_actual', 0)
      .in('producto_id', prodIds)
      .limit(limit)
    porProductoNormal = (dataNormal ?? []) as unknown as Array<Record<string, unknown>>

    // Variantes de kits (pueden tener stock=0 en la variante)
    const { data: dataKit } = await supabase
      .from('variantes_producto')
      .select(SELECT_VARIANTE)
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .gte('stock_actual', 0)
      .in('producto_id', prodIds)
      .limit(limit)
    // Filtrar solo kits del resultado
    porProductoKit = ((dataKit ?? []) as unknown as Array<Record<string, unknown>>)
      .filter((r) => {
        const prod = (Array.isArray(r.producto) ? r.producto[0] : r.producto) as Record<string, unknown> | null
        return (prod?.es_kit as boolean) === true
      })
  }

  const merged = new Map<string, VarianteResultado>()
  for (const r of ((porBarcode ?? []) as unknown as Array<Record<string, unknown>>)) {
    const v = mapVariante(r)
    merged.set(v.id, v)
  }
  for (const r of porProductoNormal) {
    const v = mapVariante(r)
    if (!merged.has(v.id)) merged.set(v.id, v)
  }
  for (const r of porProductoKit) {
    const v = mapVariante(r)
    if (!merged.has(v.id)) merged.set(v.id, v)
  }

  const todasVariantes = Array.from(merged.values())
  await computarStockKits(supabase, tiendaId, todasVariantes)

  const variantes = todasVariantes
    .filter((v) => v.es_kit ? v.stock_efectivo > 0 : v.stock_actual > 0)
    .slice(0, limit)
  const packs = generarPackVariantes(variantes.filter((v) => !v.es_kit))
  return [...variantes, ...packs].filter((v) => v.stock_efectivo > 0)
}

export async function obtenerVariantePorCodigoBarras(
  codigo: string
): Promise<VarianteResultado | null> {
  const { supabase, tiendaId } = await getCtx()
  const { data, error } = await supabase
    .from('variantes_producto')
    .select(SELECT_VARIANTE)
    .eq('tienda_id', tiendaId)
    .eq('codigo_barras', codigo)
    .eq('activo', true)
    .maybeSingle()

  if (error || !data) {
    // Intentar con pack_codigo_barras
    const { data: packData } = await supabase
      .from('variantes_producto')
      .select(SELECT_VARIANTE)
      .eq('tienda_id', tiendaId)
      .eq('pack_codigo_barras', codigo)
      .eq('pack_habilitado', true)
      .eq('activo', true)
      .maybeSingle()
    if (packData) {
      const variante = mapVariante(packData as unknown as Record<string, unknown>)
      const packs = generarPackVariantes([variante])
      return packs[0] ?? null
    }
    return null
  }
  const variante = mapVariante(data as unknown as Record<string, unknown>)
  if (variante.es_kit) {
    await computarStockKits(supabase, tiendaId, [variante])
  }
  return variante
}

/**
 * Retorna los productos con stock para mostrar en la grilla del POS.
 * Solo incluye productos activos con al menos una variante con stock > 0.
 */
export async function listarProductosPOS(limit = 100): Promise<ProductoPOS[]> {
  const { supabase, tiendaId } = await getCtx()

  const { data: productosRaw } = await supabase
    .from('productos')
    .select('id, nombre, precio_venta, imagen_url, categoria_id, categoria:categorias(id, nombre)')
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .order('nombre', { ascending: true })
    .limit(limit)

  if (!productosRaw || productosRaw.length === 0) return []

  const prodIds = (productosRaw as Array<{ id: string }>).map((p) => p.id)

  const { data: variantesRaw } = await supabase
    .from('variantes_producto')
    .select(SELECT_VARIANTE)
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .gte('stock_actual', 0)  // incluye kits (stock_actual siempre 0)
    .in('producto_id', prodIds)

  const variantesMapeadas = ((variantesRaw ?? []) as unknown as Array<Record<string, unknown>>).map(mapVariante)
  await computarStockKits(supabase, tiendaId, variantesMapeadas)
  const packVirtuales = generarPackVariantes(variantesMapeadas.filter((v) => !v.es_kit))
  const todasVariantes = [...variantesMapeadas, ...packVirtuales].filter((v) => v.stock_efectivo > 0)

  const variantesByProducto = new Map<string, VarianteResultado[]>()
  for (const v of todasVariantes) {
    if (!variantesByProducto.has(v.producto_id)) variantesByProducto.set(v.producto_id, [])
    variantesByProducto.get(v.producto_id)!.push(v)
  }

  const result: ProductoPOS[] = []
  for (const p of productosRaw as Array<Record<string, unknown>>) {
    const pvariantes = variantesByProducto.get(p.id as string) ?? []
    if (pvariantes.length === 0) continue
    const cat = (Array.isArray(p.categoria) ? p.categoria[0] : p.categoria) as
      | Record<string, unknown>
      | null
    result.push({
      id: p.id as string,
      nombre: p.nombre as string,
      precio_venta: Number(p.precio_venta ?? 0),
      imagen_url: (p.imagen_url as string | null) ?? null,
      categoria_id: (p.categoria_id as string | null) ?? null,
      categoria_nombre: (cat?.nombre as string | null) ?? null,
      variantes: pvariantes,
    })
  }
  return result
}

