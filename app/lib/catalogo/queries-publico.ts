import { createAdminClient } from '@/lib/supabase/admin'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { tieneAcceso } from '@/lib/planes/acceso'
import { esStockVendible } from '@/lib/stock/infinito'
import { getConfigRubro } from '@/lib/rubro/config'
import type { Rubro } from '@/lib/rubro/config'
import type {
  PackCatalogoPublico,
  ProductoCatalogoPublico,
  ProductoDestacadoCatalogo,
  CategoriaCatalogoPublica,
  TiendaCatalogoPublica,
  VarianteCatalogoPublica,
} from './types'
import { CATALOGO_MAX_DESTACADOS, CATALOGO_PAGE_SIZE } from './const'
import { catalogoTag, CATALOGO_REVALIDATE_SEC } from './cache-tags'
import type { TramoCantidad } from '@/lib/precios/tramos-cantidad'

const TIENDA_COLS =
  'id, nombre, logo_url, direccion, ciudad, catalogo_activo, catalogo_retiro, catalogo_envio, catalogo_mensaje_bienvenida, whatsapp_pedidos, acceso_hasta, trial_hasta, activo, catalogo_slug, rubro'

export interface TiendaCatalogoInterna {
  id: string
  nombre: string
  logo_url: string | null
  direccion: string | null
  ciudad: string | null
  catalogo_activo: boolean
  catalogo_retiro: boolean
  catalogo_envio: boolean
  catalogo_mensaje_bienvenida: string | null
  whatsapp_pedidos: string | null
  catalogo_slug: string
  rubro: Rubro
  usarPedidoCc: boolean
  recargoCcDefault: number
}

export function aDtoPublico(t: TiendaCatalogoInterna): TiendaCatalogoPublica {
  return {
    slug: t.catalogo_slug,
    nombre: t.nombre,
    logo_url: t.logo_url,
    direccion: t.direccion,
    ciudad: t.ciudad,
    catalogo_retiro: t.catalogo_retiro,
    catalogo_envio: t.catalogo_envio,
    catalogo_mensaje_bienvenida: t.catalogo_mensaje_bienvenida,
    usarPedidoCc: t.usarPedidoCc,
    recargoCcDefault: t.recargoCcDefault,
  }
}

type TiendaRow = {
  id: string
  nombre: string
  logo_url: string | null
  direccion: string | null
  ciudad: string | null
  catalogo_activo: boolean
  catalogo_retiro: boolean
  catalogo_envio: boolean
  catalogo_mensaje_bienvenida: string | null
  whatsapp_pedidos: string | null
  acceso_hasta: string | null
  trial_hasta: string | null
  activo: boolean
  catalogo_slug: string | null
  rubro: string | null
}

function filaPublicable(row: TiendaRow): Omit<TiendaCatalogoInterna, 'usarPedidoCc' | 'recargoCcDefault'> | null {
  if (!row.activo || !row.catalogo_activo || !row.catalogo_slug) return null
  if (!tieneAcceso({ acceso_hasta: row.acceso_hasta, trial_hasta: row.trial_hasta })) {
    return null
  }
  return {
    id: row.id,
    nombre: row.nombre,
    logo_url: row.logo_url,
    direccion: row.direccion,
    ciudad: row.ciudad,
    catalogo_activo: row.catalogo_activo,
    catalogo_retiro: row.catalogo_retiro,
    catalogo_envio: row.catalogo_envio,
    catalogo_mensaje_bienvenida: row.catalogo_mensaje_bienvenida,
    whatsapp_pedidos: row.whatsapp_pedidos,
    catalogo_slug: row.catalogo_slug,
    rubro: (row.rubro ?? 'generico') as Rubro,
  }
}

/** Server-only. Service role + allowlist. No devolver al client el WA. Cacheado por request. */
const fetchTiendaCatalogoPorSlug = cache(
  async (slug: string): Promise<TiendaCatalogoInterna | null> => {
    const s = slug.trim().toLowerCase()
    if (!s) return null
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('tiendas')
      .select(TIENDA_COLS)
      .eq('catalogo_slug', s)
      .maybeSingle()
    if (error || !data) return null
    const base = filaPublicable(data as TiendaRow)
    if (!base) return null
    const usarPedidoCc = getConfigRubro(base.rubro).usarPedidoCc
    let recargoCcDefault = 0
    if (usarPedidoCc) {
      const { data: cfg } = await admin
        .from('configuracion_tienda')
        .select('recargo_cc_default')
        .eq('tienda_id', base.id)
        .maybeSingle()
      recargoCcDefault = Number(
        (cfg as { recargo_cc_default?: number } | null)?.recargo_cc_default ?? 0
      )
    }
    return { ...base, usarPedidoCc, recargoCcDefault }
  }
)

export async function obtenerTiendaCatalogoPorSlug(
  slug: string
): Promise<TiendaCatalogoInterna | null> {
  return fetchTiendaCatalogoPorSlug(slug)
}

type VarianteJoin = {
  id: string
  precio_venta: number | null
  stock_actual: number
  activo: boolean
  imagen_url: string | null
  talla: { nombre: string } | null
  color: { nombre: string } | null
}

type ProductoJoin = {
  id: string
  nombre: string
  descripcion: string | null
  precio_venta: number
  recargo_cc_pct: number | null
  imagen_url: string | null
  categoria_id: string | null
  categoria: { id: string; nombre: string } | { id: string; nombre: string }[] | null
  variantes: VarianteJoin[] | null
}

function mapProducto(
  p: ProductoJoin,
  permiteInfinito: boolean
): ProductoCatalogoPublico | null {
  const variantesRaw = (p.variantes ?? []).filter((v) => v.activo)
  const variantes: VarianteCatalogoPublica[] = variantesRaw.map((v) => {
    const precio = Number(v.precio_venta ?? p.precio_venta ?? 0)
    const stock = Number(v.stock_actual ?? 0)
    return {
      id: v.id,
      precio_venta: precio,
      stock_actual: stock,
      talla: v.talla?.nombre ?? null,
      color: v.color?.nombre ?? null,
      imagen_url: v.imagen_url || p.imagen_url,
      vendible: esStockVendible(stock, permiteInfinito) && precio > 0,
    }
  })
  const vendibles = variantes.filter((v) => v.vendible)
  if (vendibles.length === 0) return null
  const cat = Array.isArray(p.categoria) ? p.categoria[0] : p.categoria
  return {
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precio_venta: Number(p.precio_venta ?? 0),
    recargo_cc_pct: p.recargo_cc_pct != null ? Number(p.recargo_cc_pct) : null,
    imagen_url: p.imagen_url,
    categoria_id: cat?.id ?? p.categoria_id ?? null,
    categoria_nombre: cat?.nombre ?? null,
    variantes: vendibles,
    tramos: [],
    packs: [],
  }
}

const PRODUCTO_SELECT =
  'id, nombre, descripcion, precio_venta, recargo_cc_pct, imagen_url, categoria_id, ' +
  'categoria:categorias ( id, nombre ), ' +
  'variantes:variantes_producto ( id, precio_venta, stock_actual, activo, imagen_url, ' +
  'talla:tallas ( nombre ), color:colores ( nombre ) )'

async function adjuntarTramosPublicos(
  admin: ReturnType<typeof createAdminClient>,
  tiendaId: string,
  productos: ProductoCatalogoPublico[]
): Promise<void> {
  const ids = productos.map((p) => p.id)
  if (ids.length === 0) return
  const { data } = await admin
    .from('producto_tramos_cantidad')
    .select('producto_id, cantidad_desde, descuento_pct')
    .eq('tienda_id', tiendaId)
    .in('producto_id', ids)
  const byProd = new Map<string, TramoCantidad[]>()
  for (const t of (data ?? []) as Array<{
    producto_id: string
    cantidad_desde: number
    descuento_pct: number
  }>) {
    const list = byProd.get(t.producto_id) ?? []
    list.push({
      cantidad_desde: Number(t.cantidad_desde),
      descuento_pct: Number(t.descuento_pct),
    })
    byProd.set(t.producto_id, list)
  }
  for (const p of productos) {
    p.tramos = (byProd.get(p.id) ?? []).sort((a, b) => a.cantidad_desde - b.cantidad_desde)
  }
}

async function adjuntarPacksPublicos(
  admin: ReturnType<typeof createAdminClient>,
  tiendaId: string,
  productos: ProductoCatalogoPublico[]
): Promise<void> {
  const ids = productos.map((p) => p.id)
  if (ids.length === 0) return
  const { data: packsRaw } = await admin
    .from('producto_packs')
    .select('id, producto_id, unidades, precio, nombre, imagen_url, orden, recargo_cc_pct')
    .eq('tienda_id', tiendaId)
    .in('producto_id', ids)
    .order('orden', { ascending: true })
    .order('unidades', { ascending: true })
  const packs = (packsRaw ?? []) as Array<{
    id: string
    producto_id: string
    unidades: number
    precio: number
    nombre: string | null
    imagen_url: string | null
    recargo_cc_pct: number | null
  }>
  if (packs.length === 0) return
  const { data: tramosRaw } = await admin
    .from('producto_pack_tramos')
    .select('pack_id, cantidad_desde, descuento_pct')
    .eq('tienda_id', tiendaId)
    .in(
      'pack_id',
      packs.map((p) => p.id)
    )
  const tramosByPack = new Map<string, TramoCantidad[]>()
  for (const t of (tramosRaw ?? []) as Array<{
    pack_id: string
    cantidad_desde: number
    descuento_pct: number
  }>) {
    const list = tramosByPack.get(t.pack_id) ?? []
    list.push({
      cantidad_desde: Number(t.cantidad_desde),
      descuento_pct: Number(t.descuento_pct),
    })
    tramosByPack.set(t.pack_id, list)
  }
  const byProd = new Map<string, PackCatalogoPublico[]>()
  for (const p of packs) {
    const pack: PackCatalogoPublico = {
      id: p.id,
      unidades: Number(p.unidades),
      precio: Number(p.precio),
      nombre: p.nombre,
      imagen_url: p.imagen_url,
      recargo_cc_pct: p.recargo_cc_pct != null ? Number(p.recargo_cc_pct) : null,
      tramos: (tramosByPack.get(p.id) ?? []).sort((a, b) => a.cantidad_desde - b.cantidad_desde),
    }
    const list = byProd.get(p.producto_id) ?? []
    list.push(pack)
    byProd.set(p.producto_id, list)
  }
  for (const p of productos) {
    p.packs = byProd.get(p.id) ?? []
  }
}

export interface ListarProductosCatalogoOptions {
  page?: number
  pageSize?: number
  categoriaId?: string | null
  /** `__sin__` = sin categoría */
  search?: string | null
}

export async function listarDestacadosCatalogo(
  tiendaId: string,
  permiteInfinito: boolean
): Promise<ProductoDestacadoCatalogo[]> {
  return unstable_cache(
    () => listarDestacadosCatalogoImpl(tiendaId, permiteInfinito),
    [`cat-dest-${tiendaId}-${permiteInfinito}`],
    { revalidate: CATALOGO_REVALIDATE_SEC, tags: [catalogoTag(tiendaId)] }
  )()
}

async function listarDestacadosCatalogoImpl(
  tiendaId: string,
  permiteInfinito: boolean
): Promise<ProductoDestacadoCatalogo[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('productos')
    .select(PRODUCTO_SELECT)
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .eq('visible_en_catalogo', true)
    .eq('destacado_en_catalogo', true)
    .eq('es_kit', false)
    .eq('es_bundle', false)
    .order('updated_at', { ascending: false })
    .limit(CATALOGO_MAX_DESTACADOS)
  if (error || !data) return []
  const out: ProductoDestacadoCatalogo[] = []
  for (const row of data as unknown as ProductoJoin[]) {
    const p = mapProducto(row, permiteInfinito)
    if (!p) continue
    const precios = p.variantes.map((v) => v.precio_venta)
    const unitMin = Math.min(...precios, p.precio_venta)
    out.push({
      id: p.id,
      nombre: p.nombre,
      imagen_url: p.imagen_url,
      precio_desde: unitMin,
      hay_desde: precios.some((x) => x !== unitMin),
    })
  }
  return out
}

/** Categorías que tienen al menos un producto visible en catálogo. */
export async function listarCategoriasCatalogoPublico(
  tiendaId: string
): Promise<CategoriaCatalogoPublica[]> {
  return unstable_cache(
    () => listarCategoriasCatalogoPublicoImpl(tiendaId),
    [`cat-cats-${tiendaId}`],
    { revalidate: CATALOGO_REVALIDATE_SEC, tags: [catalogoTag(tiendaId)] }
  )()
}

async function listarCategoriasCatalogoPublicoImpl(
  tiendaId: string
): Promise<CategoriaCatalogoPublica[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('categorias')
    .select('id, nombre, productos!inner(id)')
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .eq('productos.activo', true)
    .eq('productos.visible_en_catalogo', true)
    .eq('productos.es_kit', false)
    .eq('productos.es_bundle', false)
  if (error || !data) return []
  const map = new Map<string, CategoriaCatalogoPublica>()
  for (const row of data as Array<{ id: string; nombre: string }>) {
    if (!map.has(row.id)) map.set(row.id, { id: row.id, nombre: row.nombre })
  }
  return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export async function catalogoTieneSinCategoria(tiendaId: string): Promise<boolean> {
  return unstable_cache(
    () => catalogoTieneSinCategoriaImpl(tiendaId),
    [`cat-sin-cat-${tiendaId}`],
    { revalidate: CATALOGO_REVALIDATE_SEC, tags: [catalogoTag(tiendaId)] }
  )()
}

async function catalogoTieneSinCategoriaImpl(tiendaId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { count } = await admin
    .from('productos')
    .select('id', { count: 'exact', head: true })
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .eq('visible_en_catalogo', true)
    .eq('es_kit', false)
    .eq('es_bundle', false)
    .is('categoria_id', null)
  return (count ?? 0) > 0
}

export async function listarProductosCatalogo(
  tiendaId: string,
  permiteInfinito: boolean,
  opts: ListarProductosCatalogoOptions = {}
): Promise<{ items: ProductoCatalogoPublico[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, opts.page ?? 1)
  const categoriaId = opts.categoriaId ?? ''
  const search = opts.search?.trim() ?? ''
  return unstable_cache(
    () => listarProductosCatalogoImpl(tiendaId, permiteInfinito, { ...opts, page }),
    [`cat-prod-${tiendaId}-${page}-${categoriaId}-${search}-${permiteInfinito}`],
    { revalidate: CATALOGO_REVALIDATE_SEC, tags: [catalogoTag(tiendaId)] }
  )()
}

async function listarProductosCatalogoImpl(
  tiendaId: string,
  permiteInfinito: boolean,
  opts: ListarProductosCatalogoOptions = {}
): Promise<{ items: ProductoCatalogoPublico[]; total: number; page: number; pageSize: number }> {
  const admin = createAdminClient()
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = opts.pageSize ?? CATALOGO_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = admin
    .from('productos')
    .select(PRODUCTO_SELECT, { count: 'exact' })
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .eq('visible_en_catalogo', true)
    .eq('es_kit', false)
    .eq('es_bundle', false)
    .order('nombre', { ascending: true })
    .range(from, to)

  if (opts.categoriaId === '__sin__') {
    query = query.is('categoria_id', null)
  } else if (opts.categoriaId) {
    query = query.eq('categoria_id', opts.categoriaId)
  }

  if (opts.search?.trim()) {
    const term = opts.search.trim().replace(/[%_]/g, '\\$&')
    query = query.ilike('nombre', `%${term}%`)
  }

  const { data, error, count } = await query
  if (error || !data) {
    return { items: [], total: 0, page, pageSize }
  }

  const productos = (data as unknown as ProductoJoin[])
    .map((p) => mapProducto(p, permiteInfinito))
    .filter((p): p is ProductoCatalogoPublico => p != null)

  await adjuntarTramosPublicos(admin, tiendaId, productos)
  await adjuntarPacksPublicos(admin, tiendaId, productos)
  return { items: productos, total: count ?? productos.length, page, pageSize }
}

export async function obtenerProductoCatalogo(
  tiendaId: string,
  productoId: string,
  permiteInfinito: boolean
): Promise<ProductoCatalogoPublico | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('productos')
    .select(PRODUCTO_SELECT)
    .eq('tienda_id', tiendaId)
    .eq('id', productoId)
    .eq('activo', true)
    .eq('visible_en_catalogo', true)
    .eq('es_kit', false)
    .eq('es_bundle', false)
    .maybeSingle()
  if (error || !data) return null
  const producto = mapProducto(data as unknown as ProductoJoin, permiteInfinito)
  if (!producto) return null
  await adjuntarTramosPublicos(admin, tiendaId, [producto])
  await adjuntarPacksPublicos(admin, tiendaId, [producto])
  return producto
}

export async function obtenerRubroTiendaId(tiendaId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('tiendas').select('rubro').eq('id', tiendaId).maybeSingle()
  return (data as { rubro?: string } | null)?.rubro ?? null
}
