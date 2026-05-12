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
  'producto:productos!inner(id, nombre, codigo_base, precio_venta, unidad_de_medida, activo), ' +
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
    stock_actual: Number(raw.stock_actual ?? 0),
    unidad_de_medida: (producto?.unidad_de_medida as string | null) ?? 'unidad',
  }
}

/**
 * Busca variantes para el POS.
 *
 * - Si el query es un EAN-13 (13 dígitos), se hace match exacto sobre `codigo_barras`.
 * - Si no, se hace ILIKE sobre nombre del producto, código base del producto y código de barras.
 *
 * Solo retorna variantes activas con stock > 0 y producto activo.
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
    const { data, error } = await supabase
      .from('variantes_producto')
      .select(SELECT_VARIANTE)
      .eq('tienda_id', tiendaId)
      .eq('codigo_barras', q)
      .eq('activo', true)
      .gt('stock_actual', 0)
      .limit(limit)

    if (error) {
      console.error('buscarVariantes EAN-13 error', error)
      return []
    }
    return ((data ?? []) as unknown as Array<Record<string, unknown>>).map(mapVariante)
  }

  // Búsqueda parcial (ILIKE): para evitar problemas con OR sobre tablas referenciadas
  // hacemos dos queries (productos por nombre/código + variantes por código_barras) y unimos.
  const term = q.replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim()
  const pattern = `%${term}%`

  // 1) Buscar productos cuyo nombre o codigo_base hagan match
  const { data: prodIdsRaw } = await supabase
    .from('productos')
    .select('id')
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .or(`nombre.ilike.${pattern},codigo_base.ilike.${pattern}`)
    .limit(50)

  const prodIds = ((prodIdsRaw ?? []) as Array<{ id: string }>).map((p) => p.id)

  // 2) Variantes que coincidan por codigo_barras
  const { data: porBarcode } = await supabase
    .from('variantes_producto')
    .select(SELECT_VARIANTE)
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .gt('stock_actual', 0)
    .ilike('codigo_barras', pattern)
    .limit(limit)

  // 3) Variantes de los productos encontrados
  let porProducto: Array<Record<string, unknown>> = []
  if (prodIds.length > 0) {
    const { data: vp } = await supabase
      .from('variantes_producto')
      .select(SELECT_VARIANTE)
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .gt('stock_actual', 0)
      .in('producto_id', prodIds)
      .limit(limit)
    porProducto = (vp ?? []) as unknown as Array<Record<string, unknown>>
  }

  // Merge único por id
  const merged = new Map<string, VarianteResultado>()
  for (const r of ((porBarcode ?? []) as unknown as Array<Record<string, unknown>>)) {
    const v = mapVariante(r)
    merged.set(v.id, v)
  }
  for (const r of porProducto) {
    const v = mapVariante(r)
    if (!merged.has(v.id)) merged.set(v.id, v)
  }

  return Array.from(merged.values()).slice(0, limit)
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
  return mapVariante(data as unknown as Record<string, unknown>)
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
    .gt('stock_actual', 0)
    .in('producto_id', prodIds)

  const variantes = ((variantesRaw ?? []) as unknown as Array<Record<string, unknown>>).map(mapVariante)

  const variantesByProducto = new Map<string, VarianteResultado[]>()
  for (const v of variantes) {
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
