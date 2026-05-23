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
  /** Para bundles: packs disponibles calculados desde componentes. Para normales = stock_actual */
  stock_efectivo: number
  es_bundle: boolean
  unidad_de_medida: string
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
  'producto:productos!inner(id, nombre, codigo_base, precio_venta, unidad_de_medida, activo, es_bundle), ' +
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

  const esBundleFlag = (producto?.es_bundle as boolean) ?? false
  const stockActual = Number(raw.stock_actual ?? 0)
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
    stock_efectivo: esBundleFlag ? -1 : stockActual, // -1 = pendiente de calcular para bundles
    es_bundle: esBundleFlag,
    unidad_de_medida: (producto?.unidad_de_medida as string | null) ?? 'unidad',
  }
}

/**
 * Para un array de variantes bundle (stock_efectivo = -1), calcula
 * los packs disponibles a partir de la tabla producto_componentes.
 * Muta el array in-place y devuelve las mismas variantes.
 */
async function enrichirBundles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tiendaId: string,
  variantes: VarianteResultado[]
): Promise<VarianteResultado[]> {
  const bundleIds = variantes.filter((v) => v.es_bundle).map((v) => v.id)
  if (bundleIds.length === 0) return variantes

  const { data: componentes } = await supabase
    .from('producto_componentes')
    .select(
      'variante_bundle_id, cantidad, ' +
      'comp:variantes_producto!componente_variante_id(stock_actual)'
    )
    .in('variante_bundle_id', bundleIds)
    .eq('tienda_id', tiendaId)

  // Calcular min(floor(comp_stock / cantidad)) por bundle
  const stockPorBundle = new Map<string, number>()
  for (const row of (componentes ?? []) as unknown as Array<{
    variante_bundle_id: string
    cantidad: number
    comp: { stock_actual: number } | Array<{ stock_actual: number }>
  }>) {
    const comp = Array.isArray(row.comp) ? row.comp[0] : row.comp
    const packs = Math.floor(Number(comp?.stock_actual ?? 0) / Number(row.cantidad))
    const prev = stockPorBundle.get(row.variante_bundle_id)
    stockPorBundle.set(row.variante_bundle_id, prev === undefined ? packs : Math.min(prev, packs))
  }

  for (const v of variantes) {
    if (v.es_bundle) {
      v.stock_efectivo = stockPorBundle.get(v.id) ?? 0
    }
  }

  return variantes
}

/**
 * Busca variantes para el POS.
 *
 * - Si el query es un EAN-13 (13 dígitos), se hace match exacto sobre `codigo_barras`.
 * - Si no, se hace ILIKE sobre nombre del producto, código base del producto y código de barras.
 *
 * Retorna variantes activas con stock > 0. Incluye bundles si tienen
 * componentes con stock suficiente.
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
    // Intentar primero variante normal con stock
    const { data: normalData } = await supabase
      .from('variantes_producto')
      .select(SELECT_VARIANTE)
      .eq('tienda_id', tiendaId)
      .eq('codigo_barras', q)
      .eq('activo', true)
      .gt('stock_actual', 0)
      .limit(1)

    if (normalData && (normalData as unknown[]).length > 0) {
      return ((normalData ?? []) as unknown as Array<Record<string, unknown>>).map(mapVariante)
    }

    // Buscar bundle con ese código (bundles tienen stock_actual=0)
    const { data: bundleData } = await supabase
      .from('variantes_producto')
      .select(SELECT_VARIANTE)
      .eq('tienda_id', tiendaId)
      .eq('codigo_barras', q)
      .eq('activo', true)
      .limit(1)

    if (!bundleData) return []
    const bundleVariantes = ((bundleData ?? []) as unknown as Array<Record<string, unknown>>)
      .map(mapVariante)
      .filter((v) => v.es_bundle)
    if (bundleVariantes.length === 0) return []
    const enriched = await enrichirBundles(supabase, tiendaId, bundleVariantes)
    return enriched.filter((v) => v.stock_efectivo > 0)
  }

  // Búsqueda parcial (ILIKE)
  const term = q.replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim()
  const pattern = `%${term}%`

  // 1) IDs de productos con match (incluye bundles)
  const { data: prodIdsRaw } = await supabase
    .from('productos')
    .select('id')
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .or(`nombre.ilike.${pattern},codigo_base.ilike.${pattern}`)
    .limit(50)

  const prodIds = ((prodIdsRaw ?? []) as Array<{ id: string }>).map((p) => p.id)

  // 2) Variantes por codigo_barras (solo normales, con stock)
  const { data: porBarcode } = await supabase
    .from('variantes_producto')
    .select(SELECT_VARIANTE)
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .gt('stock_actual', 0)
    .ilike('codigo_barras', pattern)
    .limit(limit)

  // 3a) Variantes de productos normales (con stock)
  // 3b) Variantes de bundles (sin filtro de stock)
  let porProductoNormal: Array<Record<string, unknown>> = []
  let porProductoBundle: Array<Record<string, unknown>> = []
  if (prodIds.length > 0) {
    const [normalRes, bundleRes] = await Promise.all([
      supabase
        .from('variantes_producto')
        .select(SELECT_VARIANTE)
        .eq('tienda_id', tiendaId)
        .eq('activo', true)
        .gt('stock_actual', 0)
        .in('producto_id', prodIds)
        .limit(limit),
      supabase
        .from('variantes_producto')
        .select(SELECT_VARIANTE)
        .eq('tienda_id', tiendaId)
        .eq('activo', true)
        .in('producto_id', prodIds)
        .limit(limit),
    ])
    porProductoNormal = (normalRes.data ?? []) as unknown as Array<Record<string, unknown>>
    // De los resultados de la segunda query, solo nos quedamos con los bundles
    porProductoBundle = ((bundleRes.data ?? []) as unknown as Array<Record<string, unknown>>)
      .filter((r) => {
        const prod = (Array.isArray(r.producto) ? r.producto[0] : r.producto) as Record<string, unknown> | null
        return prod?.es_bundle === true
      })
  }

  // Merge único por id
  const merged = new Map<string, VarianteResultado>()
  for (const r of ((porBarcode ?? []) as unknown as Array<Record<string, unknown>>)) {
    const v = mapVariante(r)
    merged.set(v.id, v)
  }
  for (const r of [...porProductoNormal, ...porProductoBundle]) {
    const v = mapVariante(r)
    if (!merged.has(v.id)) merged.set(v.id, v)
  }

  const resultado = Array.from(merged.values()).slice(0, limit)
  await enrichirBundles(supabase, tiendaId, resultado)
  return resultado.filter((v) => v.stock_efectivo > 0)
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

  if (error || !data) return null
  const variante = mapVariante(data as unknown as Record<string, unknown>)
  if (variante.es_bundle) {
    await enrichirBundles(supabase, tiendaId, [variante])
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

  // Cargar variantes normales (con stock) + variantes bundle (sin filtro de stock)
  const [variantesNormalRes, variantesBundleRes] = await Promise.all([
    supabase
      .from('variantes_producto')
      .select(SELECT_VARIANTE)
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .gt('stock_actual', 0)
      .in('producto_id', prodIds),
    supabase
      .from('variantes_producto')
      .select(SELECT_VARIANTE)
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .in('producto_id', prodIds),
  ])

  const variantesNormales = ((variantesNormalRes.data ?? []) as unknown as Array<Record<string, unknown>>).map(mapVariante)
  // Solo bundles de la segunda query
  const variantesBundles = ((variantesBundleRes.data ?? []) as unknown as Array<Record<string, unknown>>)
    .map(mapVariante)
    .filter((v) => v.es_bundle)

  // Merge único
  const variantesMap = new Map<string, VarianteResultado>()
  for (const v of [...variantesNormales, ...variantesBundles]) {
    variantesMap.set(v.id, v)
  }
  const variantes = Array.from(variantesMap.values())

  // Calcular stock_efectivo para bundles
  await enrichirBundles(supabase, tiendaId, variantes)
  // Filtrar bundles sin stock
  const variantesFiltradas = variantes.filter((v) => v.stock_efectivo > 0)

  const variantesByProducto = new Map<string, VarianteResultado[]>()
  for (const v of variantesFiltradas) {
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
