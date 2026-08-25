import { createClient } from '@/lib/supabase/server'
import type { TipoMovimientoStock } from '@/types/database'
import { nombreUsuario } from '@/lib/caja/queries'
import { esStockInfinito } from '@/lib/stock/infinito'

export interface VarianteStockItem {
  id: string
  producto_id: string
  producto_nombre: string
  codigo_base: string | null
  codigo_barras: string | null
  talla: string | null
  color: string | null
  color_hex: string | null
  precio_venta: number | null
  stock_actual: number
  stock_minimo: number
  bajo_stock: boolean
  unidad_de_medida: string
  es_bundle: boolean
}

export interface VarianteStockDetalle extends VarianteStockItem {
  precio_compra: number
  activo: boolean
  tienda_id: string
  updated_at: string
}

export interface MovimientoStockItem {
  id: string
  variante_id: string
  variante_nombre: string
  variante_label: string | null
  codigo_barras: string | null
  tipo: TipoMovimientoStock
  cantidad: number
  stock_anterior: number
  stock_posterior: number
  motivo: string | null
  venta_id: string | null
  numero_ticket: number | null
  usuario_nombre: string | null
  created_at: string
}

export interface ListarStockOptions {
  search?: string
  categoriaId?: string
  tallaId?: string
  colorId?: string
  soloBajoStock?: boolean
  page?: number
  pageSize?: number
}

export interface ListarMovimientosOptions {
  tipo?: TipoMovimientoStock
  varianteId?: string
  /** Filtrar por varias variantes (ej. todas las de un producto). */
  varianteIds?: string[]
  desde?: string
  hasta?: string
  page?: number
  pageSize?: number
}

const DEFAULT_PAGE_SIZE = 25

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
  'id, producto_id, codigo_barras, precio_venta, stock_actual, stock_minimo, ' +
  'producto:productos!inner(id, nombre, codigo_base, unidad_de_medida, activo, categoria_id, precio_compra, es_bundle), ' +
  'talla:tallas(id, nombre, orden), ' +
  'color:colores(id, nombre, hex_color)'

function mapVarianteRow(r: Record<string, unknown>): VarianteStockItem {
  const producto = (Array.isArray(r.producto) ? r.producto[0] : r.producto) as
    | Record<string, unknown>
    | null
  const talla = (Array.isArray(r.talla) ? r.talla[0] : r.talla) as
    | Record<string, unknown>
    | null
  const color = (Array.isArray(r.color) ? r.color[0] : r.color) as
    | Record<string, unknown>
    | null

  const stockActual = Number(r.stock_actual ?? 0)
  const stockMinimo = Number(r.stock_minimo ?? 0)

  return {
    id: r.id as string,
    producto_id: (r.producto_id as string) ?? (producto?.id as string),
    producto_nombre: (producto?.nombre as string) ?? 'Producto',
    codigo_base: (producto?.codigo_base as string | null) ?? null,
    codigo_barras: (r.codigo_barras as string | null) ?? null,
    talla: (talla?.nombre as string | null) ?? null,
    color: (color?.nombre as string | null) ?? null,
    color_hex: (color?.hex_color as string | null) ?? null,
    precio_venta: r.precio_venta == null ? null : Number(r.precio_venta),
    stock_actual: stockActual,
    stock_minimo: stockMinimo,
    bajo_stock: !esStockInfinito(stockActual) && stockMinimo > 0 && stockActual <= stockMinimo,
    unidad_de_medida: (producto?.unidad_de_medida as string | null) ?? 'unidad',
    es_bundle: (producto?.es_bundle as boolean) ?? false,
  }
}

/**
 * Lista variantes con stock + filtros + paginación.
 * Solo productos activos. Ordena bajo stock primero (stock_actual asc), luego nombre.
 * `soloBajoStock` usa RPC `listar_stock_bajo_ids` (comparación columna-vs-columna).
 */
export async function listarStock(
  opts: ListarStockOptions = {}
): Promise<{ items: VarianteStockItem[]; total: number; page: number; pageSize: number }> {
  const { supabase, tiendaId } = await getCtx()
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  if (opts.soloBajoStock) {
    const { data: rpcRows, error: rpcErr } = await supabase.rpc('listar_stock_bajo_ids', {
      p_limit: pageSize,
      p_offset: from,
      p_categoria_id: opts.categoriaId || null,
      p_talla_id: opts.tallaId || null,
      p_color_id: opts.colorId || null,
      p_search: opts.search?.trim() || null,
    })
    if (rpcErr) {
      console.error('listar_stock_bajo_ids error', rpcErr)
      return { items: [], total: 0, page, pageSize }
    }
    const rows = (rpcRows ?? []) as Array<{ variante_id: string; total_count: number | string }>
    const total = rows.length > 0 ? Number(rows[0].total_count) : 0
    const ids = rows.map((r) => r.variante_id)
    if (ids.length === 0) return { items: [], total, page, pageSize }

    const { data, error } = await supabase
      .from('variantes_producto')
      .select(SELECT_VARIANTE)
      .eq('tienda_id', tiendaId)
      .in('id', ids)

    if (error) {
      console.error('listarStock bajo hydrate error', error)
      return { items: [], total, page, pageSize }
    }
    const byId = new Map(
      ((data ?? []) as unknown as Array<Record<string, unknown>>)
        .filter((r) => r.producto != null)
        .map((r) => {
          const item = mapVarianteRow(r)
          return [item.id, item] as const
        })
    )
    const items = ids.map((id) => byId.get(id)).filter(Boolean) as VarianteStockItem[]
    return { items, total, page, pageSize }
  }

  let query = supabase
    .from('variantes_producto')
    .select(SELECT_VARIANTE, { count: 'exact' })
    .eq('tienda_id', tiendaId)
    .eq('activo', true)

  if (opts.tallaId) query = query.eq('talla_id', opts.tallaId)
  if (opts.colorId) query = query.eq('color_id', opts.colorId)

  if (opts.search?.trim()) {
    const term = opts.search.trim().replace(/[%_]/g, '\\$&')
    if (/^\d+$/.test(term)) {
      query = query.eq('codigo_barras', term)
    } else {
      query = query.or(`nombre.ilike.%${term}%,codigo_base.ilike.%${term}%`, {
        foreignTable: 'producto',
      })
    }
  }

  if (opts.categoriaId) {
    query = query.eq('producto.categoria_id', opts.categoriaId)
  }

  query = query.order('stock_actual', { ascending: true }).range(from, to)

  const { data, error, count } = await query
  if (error) {
    console.error('listarStock error', error)
    return { items: [], total: 0, page, pageSize }
  }

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>
  const items = rows.filter((r) => r.producto != null).map(mapVarianteRow)

  return { items, total: count ?? items.length, page, pageSize }
}

export interface StockKpis {
  total_variantes: number
  sin_stock: number
  bajo_stock: number
}

/** KPIs del listado de stock (variantes activas). */
export async function obtenerKpisStock(): Promise<StockKpis> {
  const { supabase, tiendaId } = await getCtx()
  const { data, error } = await supabase
    .from('variantes_producto')
    .select('stock_actual, stock_minimo, producto:productos!inner(activo)')
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .eq('producto.activo', true)

  if (error || !data) {
    return { total_variantes: 0, sin_stock: 0, bajo_stock: 0 }
  }

  const rows = data as Array<{
    stock_actual: number
    stock_minimo: number
  }>
  let sin = 0
  let bajo = 0
  for (const v of rows) {
    const actual = Number(v.stock_actual ?? 0)
    const minimo = Number(v.stock_minimo ?? 0)
    if (esStockInfinito(actual)) continue
    if (actual === 0) sin += 1
    if (minimo > 0 && actual <= minimo) bajo += 1
  }
  return { total_variantes: rows.length, sin_stock: sin, bajo_stock: bajo }
}

export interface ProductoStockResumen {
  id: string
  nombre: string
  codigo_base: string | null
  unidad_de_medida: string
  es_bundle: boolean
  variantes: VarianteStockItem[]
}

/** Todas las variantes activas de un producto (para ficha de stock). */
export async function obtenerProductoStock(
  productoId: string
): Promise<ProductoStockResumen | null> {
  const { supabase, tiendaId } = await getCtx()

  const { data: prod, error: pErr } = await supabase
    .from('productos')
    .select('id, nombre, codigo_base, unidad_de_medida, es_bundle')
    .eq('tienda_id', tiendaId)
    .eq('id', productoId)
    .maybeSingle()

  if (pErr || !prod) return null

  const { data, error } = await supabase
    .from('variantes_producto')
    .select(SELECT_VARIANTE)
    .eq('tienda_id', tiendaId)
    .eq('producto_id', productoId)
    .eq('activo', true)
    .order('stock_actual', { ascending: true })

  if (error) {
    console.error('obtenerProductoStock error', error)
    return null
  }

  const variantes = ((data ?? []) as unknown as Array<Record<string, unknown>>)
    .filter((r) => r.producto != null)
    .map(mapVarianteRow)

  const p = prod as {
    id: string
    nombre: string
    codigo_base: string | null
    unidad_de_medida: string | null
    es_bundle: boolean | null
  }

  return {
    id: p.id,
    nombre: p.nombre,
    codigo_base: p.codigo_base,
    unidad_de_medida: p.unidad_de_medida ?? 'unidad',
    es_bundle: Boolean(p.es_bundle),
    variantes,
  }
}

/**
 * Variante completa para vista de detalle.
 */
export async function obtenerVarianteStock(
  id: string
): Promise<VarianteStockDetalle | null> {
  const { supabase, tiendaId } = await getCtx()

  const { data, error } = await supabase
    .from('variantes_producto')
    .select(SELECT_VARIANTE + ', tienda_id, activo, updated_at')
    .eq('tienda_id', tiendaId)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  const r = data as unknown as Record<string, unknown>
  if (r.producto == null) return null

  const base = mapVarianteRow(r)
  const producto = (Array.isArray(r.producto) ? r.producto[0] : r.producto) as Record<
    string,
    unknown
  > | null

  return {
    ...base,
    precio_compra: Number(producto?.precio_compra ?? 0),
    activo: Boolean(r.activo),
    tienda_id: r.tienda_id as string,
    updated_at: r.updated_at as string,
  }
}

const SELECT_MOVIMIENTO =
  'id, variante_id, tipo, cantidad, stock_anterior, stock_posterior, motivo, venta_id, created_at, ' +
  'variante:variantes_producto!movimientos_stock_variante_id_fkey(' +
  '  id, codigo_barras,' +
  '  producto:productos(id, nombre),' +
  '  talla:tallas(nombre),' +
  '  color:colores(nombre)' +
  '), ' +
  'venta:ventas(id, numero_ticket), ' +
  'usuario:perfiles!movimientos_stock_usuario_id_fkey(id, nombre, apellido)'

function mapMovimientoRow(r: Record<string, unknown>): MovimientoStockItem {
  const variante = (Array.isArray(r.variante) ? r.variante[0] : r.variante) as
    | Record<string, unknown>
    | null
  const producto = variante
    ? ((Array.isArray(variante.producto) ? variante.producto[0] : variante.producto) as
        | Record<string, unknown>
        | null)
    : null
  const talla = variante
    ? ((Array.isArray(variante.talla) ? variante.talla[0] : variante.talla) as
        | Record<string, unknown>
        | null)
    : null
  const color = variante
    ? ((Array.isArray(variante.color) ? variante.color[0] : variante.color) as
        | Record<string, unknown>
        | null)
    : null
  const venta = (Array.isArray(r.venta) ? r.venta[0] : r.venta) as
    | Record<string, unknown>
    | null
  const usuario = (Array.isArray(r.usuario) ? r.usuario[0] : r.usuario) as
    | Record<string, unknown>
    | null

  const tallaNombre = (talla?.nombre as string | null) ?? null
  const colorNombre = (color?.nombre as string | null) ?? null
  const variantLabel =
    [tallaNombre, colorNombre].filter(Boolean).join(' / ') || null

  return {
    id: r.id as string,
    variante_id: r.variante_id as string,
    variante_nombre: (producto?.nombre as string) ?? 'Producto',
    variante_label: variantLabel,
    codigo_barras: (variante?.codigo_barras as string | null) ?? null,
    tipo: r.tipo as TipoMovimientoStock,
    cantidad: Number(r.cantidad ?? 0),
    stock_anterior: Number(r.stock_anterior ?? 0),
    stock_posterior: Number(r.stock_posterior ?? 0),
    motivo: (r.motivo as string | null) ?? null,
    venta_id: (r.venta_id as string | null) ?? null,
    numero_ticket: venta?.numero_ticket != null ? Number(venta.numero_ticket) : null,
    usuario_nombre: nombreUsuario(
      usuario as { id: string; nombre: string | null; apellido: string | null } | null
    ),
    created_at: r.created_at as string,
  }
}

/**
 * Historial de movimientos paginado con filtros.
 */
export async function listarMovimientos(
  opts: ListarMovimientosOptions = {}
): Promise<{ items: MovimientoStockItem[]; total: number; page: number; pageSize: number }> {
  const { supabase, tiendaId } = await getCtx()
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('movimientos_stock')
    .select(SELECT_MOVIMIENTO, { count: 'exact' })
    .eq('tienda_id', tiendaId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (opts.tipo) query = query.eq('tipo', opts.tipo)
  if (opts.varianteId) query = query.eq('variante_id', opts.varianteId)
  else if (opts.varianteIds && opts.varianteIds.length > 0) {
    query = query.in('variante_id', opts.varianteIds)
  }
  if (opts.desde) query = query.gte('created_at', opts.desde)
  if (opts.hasta) query = query.lte('created_at', opts.hasta)

  const { data, error, count } = await query
  if (error) {
    console.error('listarMovimientos error', error)
    return { items: [], total: 0, page, pageSize }
  }

  const items = ((data ?? []) as unknown as Array<Record<string, unknown>>).map(
    mapMovimientoRow
  )
  return { items, total: count ?? items.length, page, pageSize }
}

/**
 * Cuenta variantes con stock_minimo > 0 y stock_actual <= stock_minimo (no ∞).
 * Prefiere RPC; fallback a fetch+filtro JS.
 */
export async function contarVariantesBajoStock(): Promise<number> {
  const { supabase } = await getCtx()
  const { data, error } = await supabase.rpc('listar_stock_bajo_ids', {
    p_limit: 1,
    p_offset: 0,
    p_categoria_id: null,
    p_talla_id: null,
    p_color_id: null,
    p_search: null,
  })
  if (!error && data) {
    const rows = data as Array<{ total_count: number | string }>
    if (rows.length === 0) return 0
    return Number(rows[0].total_count)
  }

  const { supabase: sb, tiendaId } = await getCtx()
  const { data: raw, error: err2 } = await sb
    .from('variantes_producto')
    .select('stock_actual, stock_minimo')
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .gt('stock_minimo', 0)

  if (err2 || !raw) return 0
  return (raw as Array<{ stock_actual: number; stock_minimo: number }>).filter(
    (v) =>
      !esStockInfinito(v.stock_actual) &&
      v.stock_minimo > 0 &&
      v.stock_actual <= v.stock_minimo
  ).length
}
