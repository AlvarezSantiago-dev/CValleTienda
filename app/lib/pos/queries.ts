import { requireAuthCtx } from '@/lib/supabase/require-ctx'
import {
  esStockInfinito,
  esStockVendible,
  stockEfectivoDesdeComponentes,
  stockEfectivoPack,
} from '@/lib/stock/infinito'
import { rubroPermiteStockInfinito } from '@/lib/rubro/config'
import type { TramoCantidad } from '@/lib/precios/tramos-cantidad'
import type { ProductoPack } from '@/lib/packs/types'
import { idVirtualPack, labelPack } from '@/lib/packs/virtual'

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
  recargo_cc_pct: number | null
  imagen_url: string | null
  tramos: TramoCantidad[]
  pack_id: string | null
  pack_label: string | null
  packs_producto: ProductoPack[]
  packs_producto_count: number
  tramos_pack: TramoCantidad[]
}

export interface ProductoPOS {
  id: string
  nombre: string
  precio_venta: number
  imagen_url: string | null
  categoria_id: string | null
  categoria_nombre: string | null
  recargo_cc_pct: number | null
  variantes: VarianteResultado[]
}

async function getCtx() {
  const { supabase, tiendaId } = await requireAuthCtx()
  const { data: tienda } = await supabase
    .from('tiendas')
    .select('rubro')
    .eq('id', tiendaId)
    .maybeSingle()
  const permiteInfinito = rubroPermiteStockInfinito(
    (tienda as { rubro?: string } | null)?.rubro
  )
  return { supabase, tiendaId, permiteInfinito }
}

function filtroStockConStock(permiteInfinito: boolean) {
  return permiteInfinito
    ? 'stock_actual.gt.0,stock_actual.eq.-1'
    : 'stock_actual.gt.0'
}

function filtroStockIncluyeCero(permiteInfinito: boolean) {
  return permiteInfinito
    ? 'stock_actual.gte.0,stock_actual.eq.-1'
    : 'stock_actual.gte.0'
}

const SELECT_VARIANTE =
  'id, producto_id, codigo_barras, precio_venta, stock_actual, activo, imagen_url, ' +
  'pack_habilitado, pack_cantidad, pack_precio, pack_codigo_barras, ' +
  'producto:productos!inner(id, nombre, codigo_base, precio_venta, unidad_de_medida, activo, es_kit, recargo_cc_pct, imagen_url), ' +
  'talla:tallas(id, nombre), color:colores(id, nombre, hex_color)'

export function mapVariante(raw: Record<string, unknown>): VarianteResultado {
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
    stock_efectivo: esStockInfinito(stockActual) ? stockActual : stockActual,
    es_pack: false,
    pack_habilitado: packHabilitado,
    pack_cantidad: packCantidad,
    pack_precio: packPrecio,
    pack_codigo_barras: (raw.pack_codigo_barras as string | null) ?? null,
    unidad_de_medida: (producto?.unidad_de_medida as string | null) ?? 'unidad',
    es_kit: esKit,
    recargo_cc_pct:
      producto?.recargo_cc_pct != null ? Number(producto.recargo_cc_pct) : null,
    imagen_url:
      (raw.imagen_url as string | null) ??
      (producto?.imagen_url as string | null) ??
      null,
    tramos: [],
    pack_id: null,
    pack_label: null,
    packs_producto: [],
    packs_producto_count: 0,
    tramos_pack: [],
  }
}

/** Genera entradas virtuales "pack" para variantes con pack_habilitado=true */
export function generarPackVariantes(
  variantes: VarianteResultado[],
  permiteInfinito = false
): VarianteResultado[] {
  return variantes
    .filter((v) => v.pack_habilitado && v.pack_cantidad && v.pack_precio)
    .map((v) => ({
      ...v,
      id: v.id + '__pack',
      codigo_barras: v.pack_codigo_barras ?? null,
      precio_venta: v.pack_precio!,
      stock_efectivo: stockEfectivoPack(v.stock_actual, v.pack_cantidad!, permiteInfinito),
      es_pack: true,
      pack_label: labelPack(v.pack_cantidad!, null),
    }))
}

type PackRow = {
  id: string
  producto_id: string
  unidades: number
  precio: number
  codigo_barras: string | null
  imagen_url: string | null
  nombre: string | null
  orden: number
  recargo_cc_pct: number | null
}

type PackTramoRow = {
  pack_id: string
  cantidad_desde: number
  descuento_pct: number
}

export async function cargarPacksPorProducto(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  tiendaId: string,
  productoIds: string[]
): Promise<Map<string, ProductoPack[]>> {
  const byProd = new Map<string, ProductoPack[]>()
  const ids = [...new Set(productoIds.filter(Boolean))]
  if (ids.length === 0) return byProd
  const { data: packsRaw, error: packsErr } = await supabase
    .from('producto_packs')
    .select('id, producto_id, unidades, precio, codigo_barras, imagen_url, nombre, orden, recargo_cc_pct')
    .eq('tienda_id', tiendaId)
    .in('producto_id', ids)
    .order('orden', { ascending: true })
    .order('unidades', { ascending: true })
  if (packsErr) return byProd
  const packs = (packsRaw ?? []) as PackRow[]
  if (packs.length === 0) return byProd
  const packIds = packs.map((p) => p.id)
  const { data: tramosRaw } = await supabase
    .from('producto_pack_tramos')
    .select('pack_id, cantidad_desde, descuento_pct')
    .eq('tienda_id', tiendaId)
    .in('pack_id', packIds)
  const tramosByPack = new Map<string, TramoCantidad[]>()
  for (const t of (tramosRaw ?? []) as PackTramoRow[]) {
    const list = tramosByPack.get(t.pack_id) ?? []
    list.push({
      cantidad_desde: Number(t.cantidad_desde),
      descuento_pct: Number(t.descuento_pct),
    })
    tramosByPack.set(t.pack_id, list)
  }
  for (const p of packs) {
    const pack: ProductoPack = {
      id: p.id,
      producto_id: p.producto_id,
      unidades: Number(p.unidades),
      precio: Number(p.precio),
      codigo_barras: p.codigo_barras,
      imagen_url: p.imagen_url,
      nombre: p.nombre,
      orden: Number(p.orden ?? 0),
      recargo_cc_pct: p.recargo_cc_pct != null ? Number(p.recargo_cc_pct) : null,
      tramos: (tramosByPack.get(p.id) ?? []).sort((a, b) => a.cantidad_desde - b.cantidad_desde),
    }
    const list = byProd.get(p.producto_id) ?? []
    list.push(pack)
    byProd.set(p.producto_id, list)
  }
  return byProd
}

function marcarPacksEnUnidades(variantes: VarianteResultado[], byProd: Map<string, ProductoPack[]>) {
  for (const v of variantes) {
    if (v.es_pack || v.es_kit) continue
    const packs = byProd.get(v.producto_id) ?? []
    v.packs_producto = packs
    v.packs_producto_count = packs.length
    if (packs.length === 1) {
      const p = packs[0]
      v.pack_habilitado = true
      v.pack_cantidad = p.unidades
      v.pack_precio = p.precio
      v.pack_codigo_barras = p.codigo_barras
      v.tramos_pack = p.tramos
    } else if (packs.length > 1) {
      v.pack_habilitado = false
      v.tramos_pack = []
    }
  }
}

function virtualesDesdePacksProducto(
  variantes: VarianteResultado[],
  permiteInfinito: boolean
): VarianteResultado[] {
  const extras: VarianteResultado[] = []
  for (const v of variantes) {
    if (v.es_pack || v.es_kit || v.packs_producto.length === 0) continue
    for (const p of v.packs_producto) {
      extras.push({
        ...v,
        id: idVirtualPack(v.id, p.id),
        codigo_barras: p.codigo_barras,
        precio_venta: p.precio,
        stock_efectivo: stockEfectivoPack(v.stock_actual, p.unidades, permiteInfinito),
        es_pack: true,
        pack_id: p.id,
        pack_label: labelPack(p.unidades, p.nombre),
        pack_habilitado: true,
        pack_cantidad: p.unidades,
        pack_precio: p.precio,
        pack_codigo_barras: p.codigo_barras,
        imagen_url: p.imagen_url || v.imagen_url,
        tramos: p.tramos,
        tramos_pack: p.tramos,
        recargo_cc_pct: p.recargo_cc_pct ?? v.recargo_cc_pct,
      })
    }
  }
  return extras
}

export async function expandirEntradasPack(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  tiendaId: string,
  variantes: VarianteResultado[],
  permiteInfinito = false
): Promise<VarianteResultado[]> {
  const byProd = await cargarPacksPorProducto(
    supabase,
    tiendaId,
    variantes.map((v) => v.producto_id)
  )
  marcarPacksEnUnidades(variantes, byProd)
  const deProducto = virtualesDesdePacksProducto(variantes, permiteInfinito)
  const legado = generarPackVariantes(
    variantes.filter((v) => !v.es_kit && v.packs_producto_count === 0),
    permiteInfinito
  )
  return [...variantes, ...deProducto, ...legado]
}

async function adjuntarTramos(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  tiendaId: string,
  variantes: VarianteResultado[]
): Promise<void> {
  const ids = [...new Set(variantes.map((v) => v.producto_id).filter(Boolean))]
  if (ids.length === 0) return
  const { data } = await supabase
    .from('producto_tramos_cantidad')
    .select('producto_id, cantidad_desde, descuento_pct')
    .eq('tienda_id', tiendaId)
    .in('producto_id', ids)
  const byProd = new Map<string, TramoCantidad[]>()
  for (const row of (data ?? []) as Array<{
    producto_id: string
    cantidad_desde: number
    descuento_pct: number
  }>) {
    const list = byProd.get(row.producto_id) ?? []
    list.push({
      cantidad_desde: Number(row.cantidad_desde),
      descuento_pct: Number(row.descuento_pct),
    })
    byProd.set(row.producto_id, list)
  }
  for (const v of variantes) {
    if (v.es_pack && v.pack_id) continue
    v.tramos = byProd.get(v.producto_id) ?? []
  }
}

/**
 * Para variantes que son kits (es_kit=true), calcula el stock efectivo
 * como min(floor(comp.stock_actual / comp.cantidad)) sobre todos los componentes.
 * Modifica el array in-place.
 */
export async function computarStockKits(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  tiendaId: string,
  variantes: VarianteResultado[],
  permiteInfinito = false
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
    v.stock_efectivo = stockEfectivoDesdeComponentes(compList, permiteInfinito)
  }
}

/**
 * Busca variantes para el POS.
 *
 * - Primero intenta match exacto sobre código de unidad o código de pack.
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
  const { supabase, tiendaId, permiteInfinito } = await getCtx()
  const filtroStock = filtroStockConStock(permiteInfinito)

  const [exactaRes, packProdExactoRes, packExactoRes] = await Promise.all([
    supabase
      .from('variantes_producto')
      .select(SELECT_VARIANTE)
      .eq('tienda_id', tiendaId)
      .eq('codigo_barras', q)
      .eq('activo', true)
      .limit(1),
    supabase
      .from('producto_packs')
      .select('id, producto_id')
      .eq('tienda_id', tiendaId)
      .eq('codigo_barras', q)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('variantes_producto')
      .select(SELECT_VARIANTE)
      .eq('tienda_id', tiendaId)
      .eq('pack_codigo_barras', q)
      .eq('activo', true)
      .eq('pack_habilitado', true)
      .or(filtroStock)
      .limit(1),
  ])

  const exacta = exactaRes.data
  if (exacta && (exacta as unknown[]).length > 0) {
    const variantes = (exacta as unknown as Array<Record<string, unknown>>).map(mapVariante)
    await computarStockKits(supabase, tiendaId, variantes, permiteInfinito)
    await adjuntarTramos(supabase, tiendaId, variantes)
    await expandirEntradasPack(supabase, tiendaId, variantes, permiteInfinito)
    return variantes.filter((v) =>
      v.es_kit
        ? esStockVendible(v.stock_efectivo, permiteInfinito)
        : esStockVendible(v.stock_actual, permiteInfinito)
    )
  }

  const packProdExacto = packProdExactoRes.data
  if (packProdExacto) {
    const packRow = packProdExacto as { id: string; producto_id: string }
    const { data: varsPack } = await supabase
      .from('variantes_producto')
      .select(SELECT_VARIANTE)
      .eq('tienda_id', tiendaId)
      .eq('producto_id', packRow.producto_id)
      .eq('activo', true)
      .or(filtroStock)
      .limit(20)
    const unidades = ((varsPack ?? []) as unknown as Array<Record<string, unknown>>).map(mapVariante)
    await adjuntarTramos(supabase, tiendaId, unidades)
    const expanded = await expandirEntradasPack(supabase, tiendaId, unidades, permiteInfinito)
    return expanded
      .filter((v) => v.pack_id === packRow.id)
      .filter((v) => esStockVendible(v.stock_efectivo, permiteInfinito))
  }

  const packExacto = packExactoRes.data
  if (packExacto && (packExacto as unknown[]).length > 0) {
    const variantes = (packExacto as unknown as Array<Record<string, unknown>>).map(mapVariante)
    await adjuntarTramos(supabase, tiendaId, variantes)
    const expanded = await expandirEntradasPack(supabase, tiendaId, variantes, permiteInfinito)
    return expanded
      .filter((v) => v.es_pack)
      .filter((v) => esStockVendible(v.stock_efectivo, permiteInfinito))
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
  const filtroKit = filtroStockIncluyeCero(permiteInfinito)

  const { data: porBarcode } = await supabase
    .from('variantes_producto')
    .select(SELECT_VARIANTE)
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .or(filtroStock)
    .ilike('codigo_barras', pattern)
    .limit(limit)

  let porProductoNormal: Array<Record<string, unknown>> = []
  let porProductoKit: Array<Record<string, unknown>> = []
  if (prodIds.length > 0) {
    const { data: dataNormal } = await supabase
      .from('variantes_producto')
      .select(SELECT_VARIANTE)
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .or(filtroStock)
      .in('producto_id', prodIds)
      .limit(limit)
    porProductoNormal = (dataNormal ?? []) as unknown as Array<Record<string, unknown>>

    const { data: dataKit } = await supabase
      .from('variantes_producto')
      .select(SELECT_VARIANTE)
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .or(filtroKit)
      .in('producto_id', prodIds)
      .limit(limit)
    porProductoKit = ((dataKit ?? []) as unknown as Array<Record<string, unknown>>).filter(
      (r) => {
        const prod = (Array.isArray(r.producto) ? r.producto[0] : r.producto) as Record<
          string,
          unknown
        > | null
        return (prod?.es_kit as boolean) === true
      }
    )
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
  await computarStockKits(supabase, tiendaId, todasVariantes, permiteInfinito)

  const variantes = todasVariantes
    .filter((v) =>
      v.es_kit
        ? esStockVendible(v.stock_efectivo, permiteInfinito)
        : esStockVendible(v.stock_actual, permiteInfinito)
    )
    .slice(0, limit)
  await adjuntarTramos(supabase, tiendaId, variantes)
  const expanded = await expandirEntradasPack(
    supabase,
    tiendaId,
    variantes.filter((v) => !v.es_kit),
    permiteInfinito
  )
  const kits = variantes.filter((v) => v.es_kit)
  return [...kits, ...expanded].filter((v) => esStockVendible(v.stock_efectivo, permiteInfinito))
}

export async function obtenerVariantePorCodigoBarras(
  codigo: string
): Promise<VarianteResultado | null> {
  const { supabase, tiendaId, permiteInfinito } = await getCtx()
  const { data, error } = await supabase
    .from('variantes_producto')
    .select(SELECT_VARIANTE)
    .eq('tienda_id', tiendaId)
    .eq('codigo_barras', codigo)
    .eq('activo', true)
    .maybeSingle()

  if (error || !data) {
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
      await adjuntarTramos(supabase, tiendaId, [variante])
      const expanded = await expandirEntradasPack(supabase, tiendaId, [variante], permiteInfinito)
      return expanded.find((v) => v.es_pack) ?? null
    }
    const { data: packProd } = await supabase
      .from('producto_packs')
      .select('id, producto_id')
      .eq('tienda_id', tiendaId)
      .eq('codigo_barras', codigo)
      .maybeSingle()
    if (packProd) {
      const { data: varData } = await supabase
        .from('variantes_producto')
        .select(SELECT_VARIANTE)
        .eq('tienda_id', tiendaId)
        .eq('producto_id', (packProd as { producto_id: string }).producto_id)
        .eq('activo', true)
        .limit(1)
        .maybeSingle()
      if (varData) {
        const variante = mapVariante(varData as unknown as Record<string, unknown>)
        await adjuntarTramos(supabase, tiendaId, [variante])
        const expanded = await expandirEntradasPack(supabase, tiendaId, [variante], permiteInfinito)
        return (
          expanded.find((v) => v.pack_id === (packProd as { id: string }).id) ?? null
        )
      }
    }
    return null
  }
  const variante = mapVariante(data as unknown as Record<string, unknown>)
  if (variante.es_kit) {
    await computarStockKits(supabase, tiendaId, [variante], permiteInfinito)
  }
  await adjuntarTramos(supabase, tiendaId, [variante])
  await expandirEntradasPack(supabase, tiendaId, [variante], permiteInfinito)
  return variante
}

/**
 * Retorna los productos con stock para mostrar en la grilla del POS.
 * Solo incluye productos activos con al menos una variante con stock > 0.
 */
export async function listarProductosPOS(limit = 100): Promise<ProductoPOS[]> {
  const { supabase, tiendaId, permiteInfinito } = await getCtx()

  const { data: productosRaw } = await supabase
    .from('productos')
    .select('id, nombre, precio_venta, recargo_cc_pct, imagen_url, categoria_id, categoria:categorias(id, nombre)')
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
    .or(filtroStockIncluyeCero(permiteInfinito))
    .in('producto_id', prodIds)

  const variantesMapeadas = ((variantesRaw ?? []) as unknown as Array<Record<string, unknown>>).map(
    mapVariante
  )
  await computarStockKits(supabase, tiendaId, variantesMapeadas, permiteInfinito)
  await adjuntarTramos(supabase, tiendaId, variantesMapeadas)
  const kits = variantesMapeadas.filter((v) => v.es_kit)
  const noKits = variantesMapeadas.filter((v) => !v.es_kit)
  const expanded = await expandirEntradasPack(supabase, tiendaId, noKits, permiteInfinito)
  const todasVariantes = [...kits, ...expanded].filter((v) =>
    esStockVendible(v.stock_efectivo, permiteInfinito)
  )

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
      imagen_url:
        (p.imagen_url as string | null) ??
        pvariantes.find((v) => v.imagen_url)?.imagen_url ??
        null,
      categoria_id: (p.categoria_id as string | null) ?? null,
      categoria_nombre: (cat?.nombre as string | null) ?? null,
      recargo_cc_pct: p.recargo_cc_pct != null ? Number(p.recargo_cc_pct) : null,
      variantes: pvariantes,
    })
  }
  return result
}
