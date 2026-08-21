import { createAdminClient } from '@/lib/supabase/admin'
import { tieneAcceso } from '@/lib/planes/acceso'
import { esStockVendible } from '@/lib/stock/infinito'
import type {
  ProductoCatalogoPublico,
  TiendaCatalogoPublica,
  VarianteCatalogoPublica,
} from './types'
import type { TramoCantidad } from '@/lib/precios/tramos-cantidad'

const TIENDA_COLS =
  'id, nombre, logo_url, direccion, ciudad, catalogo_activo, catalogo_retiro, catalogo_envio, catalogo_mensaje_bienvenida, whatsapp_pedidos, acceso_hasta, trial_hasta, activo, catalogo_slug'

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
}

function filaPublicable(row: TiendaRow): TiendaCatalogoInterna | null {
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
  }
}

/** Server-only. Service role + allowlist. No devolver al client el WA. */
export async function obtenerTiendaCatalogoPorSlug(
  slug: string
): Promise<TiendaCatalogoInterna | null> {
  const s = slug.trim().toLowerCase()
  if (!s) return null
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tiendas')
    .select(TIENDA_COLS)
    .eq('catalogo_slug', s)
    .maybeSingle()
  if (error || !data) return null
  return filaPublicable(data as TiendaRow)
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
  imagen_url: string | null
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
  return {
    id: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion,
    precio_venta: Number(p.precio_venta ?? 0),
    imagen_url: p.imagen_url,
    variantes: vendibles,
    tramos: [],
  }
}

const PRODUCTO_SELECT =
  'id, nombre, descripcion, precio_venta, imagen_url, ' +
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

export async function listarProductosCatalogo(
  tiendaId: string,
  permiteInfinito: boolean
): Promise<ProductoCatalogoPublico[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('productos')
    .select(PRODUCTO_SELECT)
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .eq('visible_en_catalogo', true)
    .eq('es_kit', false)
    .eq('es_bundle', false)
    .order('nombre', { ascending: true })
  if (error || !data) return []
  const productos = (data as unknown as ProductoJoin[])
    .map((p) => mapProducto(p, permiteInfinito))
    .filter((p): p is ProductoCatalogoPublico => p != null)
  await adjuntarTramosPublicos(admin, tiendaId, productos)
  return productos
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
  return producto
}

export async function obtenerRubroTiendaId(tiendaId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('tiendas').select('rubro').eq('id', tiendaId).maybeSingle()
  return (data as { rubro?: string } | null)?.rubro ?? null
}
