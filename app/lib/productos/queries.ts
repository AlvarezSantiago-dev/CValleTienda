import { createClient } from '@/lib/supabase/server'
import type { Categoria, Color, HistorialPrecio, KitComponente, Producto, Talla, VarianteProducto } from '@/types/database'
import { mapTramoDb, type TramoCantidad } from '@/lib/precios/tramos-cantidad'
import type { ProductoPack } from '@/lib/packs/types'

export interface ProductoListItem extends Producto {
  categoria: { id: string; nombre: string } | null
  stock_total: number
  variantes_count: number
  /** Primer pack habilitado en alguna variante, null si ninguna tiene pack */
  pack_info: { cantidad: number; precio: number } | null
}

export interface ProductoDetail extends Producto {
  categoria: Categoria | null
  tramos: TramoCantidad[]
  packs: ProductoPack[]
  variantes: (VarianteProducto & {
    talla: Pick<Talla, 'id' | 'nombre'> | null
    color: Pick<Color, 'id' | 'nombre' | 'hex_color'> | null
    kit_componentes: KitComponente[]
  })[]
}

export interface ListarProductosOptions {
  search?: string
  categoriaId?: string
  page?: number
  pageSize?: number
}

const DEFAULT_PAGE_SIZE = 20

const PRODUCTO_LIST_COLS =
  'id, tienda_id, categoria_id, nombre, descripcion, codigo_base, precio_compra, precio_venta, unidad_de_medida, imagen_url, activo, es_bundle, es_kit, recargo_cc_pct, visible_en_catalogo, destacado_en_catalogo, unidades_contenido, created_at, updated_at'

type VarianteAggRow = {
  producto_id: string
  stock_actual: number
  pack_habilitado: boolean
  pack_cantidad: number | null
  pack_precio: number | null
}

/**
 * Lista productos activos de la tienda actual con búsqueda, filtro
 * de categoría y paginación. Calcula stock total sumando variantes.
 */
export async function listarProductos(
  opts: ListarProductosOptions = {}
): Promise<{ items: ProductoListItem[]; total: number; page: number; pageSize: number }> {
  const supabase = await createClient()
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('productos')
    .select(
      `
      ${PRODUCTO_LIST_COLS},
      categoria:categorias ( id, nombre )
    `,
      { count: 'exact' }
    )
    .eq('activo', true)
    .order('nombre', { ascending: true })
    .range(from, to)

  if (opts.search?.trim()) {
    const term = opts.search.trim().replace(/[%_]/g, '\\$&')
    // Buscar por nombre o por código_base con ilike
    query = query.or(`nombre.ilike.%${term}%,codigo_base.ilike.%${term}%`)
  }
  if (opts.categoriaId) {
    query = query.eq('categoria_id', opts.categoriaId)
  }

  const { data, error, count } = await query
  if (error) throw error

  const rows = data ?? []
  const productoIds = rows.map((r) => r.id as string)
  const aggByProducto = new Map<
    string,
    { stockTotal: number; count: number; pack?: { cantidad: number; precio: number } }
  >()

  if (productoIds.length > 0) {
    const { data: variantes, error: varErr } = await supabase
      .from('variantes_producto')
      .select('producto_id, stock_actual, pack_habilitado, pack_cantidad, pack_precio')
      .in('producto_id', productoIds)
    if (varErr) throw varErr
    for (const v of (variantes ?? []) as VarianteAggRow[]) {
      const curr = aggByProducto.get(v.producto_id) ?? { stockTotal: 0, count: 0 }
      curr.stockTotal += v.stock_actual ?? 0
      curr.count += 1
      if (v.pack_habilitado && v.pack_cantidad && v.pack_precio && !curr.pack) {
        curr.pack = { cantidad: v.pack_cantidad, precio: Number(v.pack_precio) }
      }
      aggByProducto.set(v.producto_id, curr)
    }
  }

  const items: ProductoListItem[] = rows.map((row) => {
    const id = row.id as string
    const agg = aggByProducto.get(id) ?? { stockTotal: 0, count: 0 }
    const { categoria, ...rest } = row as typeof row & {
      categoria: { id: string; nombre: string } | null
    }
    return {
      ...(rest as Producto),
      categoria,
      stock_total: agg.stockTotal,
      variantes_count: agg.count,
      pack_info: agg.pack ?? null,
    }
  })

  return { items, total: count ?? 0, page, pageSize }
}

/**
 * Obtiene un producto con todas sus variantes, talla y color resueltos.
 * Para kits, carga también los componentes de cada variante.
 */
export async function obtenerProducto(id: string): Promise<ProductoDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('productos')
    .select(
      `
      *,
      categoria:categorias ( * ),
      variantes:variantes_producto (
        *,
        talla:tallas ( id, nombre ),
        color:colores ( id, nombre, hex_color )
      )
    `
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const producto = data as unknown as ProductoDetail

  const { data: tramosRaw } = await supabase
    .from('producto_tramos_cantidad')
    .select('cantidad_desde, descuento_pct, descuento_monto, tipo')
    .eq('producto_id', id)
    .order('cantidad_desde', { ascending: true })
  producto.tramos = ((tramosRaw ?? []) as Parameters<typeof mapTramoDb>[0][]).map(mapTramoDb)

  const { data: packsRaw, error: packsErr } = await supabase
    .from('producto_packs')
    .select('id, producto_id, unidades, precio, codigo_barras, imagen_url, nombre, orden, recargo_cc_pct')
    .eq('producto_id', id)
    .order('orden', { ascending: true })
    .order('unidades', { ascending: true })
  if (packsErr) {
    producto.packs = []
  } else {
    const packs = ((packsRaw ?? []) as Array<{
      id: string
      producto_id: string
      unidades: number
      precio: number
      codigo_barras: string | null
      imagen_url: string | null
      nombre: string | null
      orden: number
      recargo_cc_pct: number | null
    }>).map((p) => ({
      id: p.id,
      producto_id: p.producto_id,
      unidades: Number(p.unidades),
      precio: Number(p.precio),
      codigo_barras: p.codigo_barras,
      imagen_url: p.imagen_url,
      nombre: p.nombre,
      orden: Number(p.orden ?? 0),
      recargo_cc_pct: p.recargo_cc_pct != null ? Number(p.recargo_cc_pct) : null,
      tramos: [] as TramoCantidad[],
    }))
    if (packs.length > 0) {
      const { data: packTramos } = await supabase
        .from('producto_pack_tramos')
        .select('pack_id, cantidad_desde, descuento_pct, descuento_monto, tipo')
        .in(
          'pack_id',
          packs.map((p) => p.id)
        )
      const byPack = new Map<string, TramoCantidad[]>()
      for (const t of (packTramos ?? []) as Array<{
        pack_id: string
        cantidad_desde: number
        descuento_pct: number
      }>) {
        const list = byPack.get(t.pack_id) ?? []
        list.push(mapTramoDb(t))
        byPack.set(t.pack_id, list)
      }
      for (const p of packs) {
        p.tramos = (byPack.get(p.id) ?? []).sort((a, b) => a.cantidad_desde - b.cantidad_desde)
      }
    }
    producto.packs = packs
  }

  // Si es kit, cargar kit_componentes por variante
  if (producto.es_kit && producto.variantes.length > 0) {
    const varIds = producto.variantes.map((v) => v.id)
    const { data: kitComps } = await supabase
      .from('kit_componentes')
      .select(
        `
        *,
        componente_variante:variantes_producto!componente_variante_id (
          id, codigo_barras, precio_venta, stock_actual,
          producto:productos!inner ( id, nombre, precio_compra ),
          talla:tallas ( id, nombre ),
          color:colores ( id, nombre, hex_color )
        )
      `
      )
      .in('kit_variante_id', varIds)

    const compsByVariante = new Map<string, KitComponente[]>()
    for (const c of ((kitComps ?? []) as unknown as KitComponente[])) {
      if (!compsByVariante.has(c.kit_variante_id)) compsByVariante.set(c.kit_variante_id, [])
      compsByVariante.get(c.kit_variante_id)!.push(c)
    }

    for (const v of producto.variantes) {
      v.kit_componentes = compsByVariante.get(v.id) ?? []
    }
  } else {
    // Asegurar que siempre exista el campo
    for (const v of producto.variantes) {
      v.kit_componentes = []
    }
  }

  return producto
}

export async function listarCategorias(soloActivas = true): Promise<Categoria[]> {
  const supabase = await createClient()
  let query = supabase.from('categorias').select('*').order('nombre', { ascending: true })
  if (soloActivas) query = query.eq('activo', true)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function listarTallas(soloActivas = true): Promise<Talla[]> {
  const supabase = await createClient()
  let query = supabase
    .from('tallas')
    .select('*')
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true })
  if (soloActivas) query = query.eq('activo', true)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function listarColores(soloActivas = true): Promise<Color[]> {
  const supabase = await createClient()
  let query = supabase.from('colores').select('*').order('nombre', { ascending: true })
  if (soloActivas) query = query.eq('activo', true)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * Retorna los últimos 20 cambios de precio_venta del producto.
 * Retorna [] si la tabla no existe todavía (migración pendiente).
 */
export async function obtenerHistorialPrecios(
  productoId: string
): Promise<HistorialPrecio[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('historial_precios')
    .select('*')
    .eq('producto_id', productoId)
    .order('changed_at', { ascending: false })
    .limit(20)
  if (error) return []
  return (data ?? []) as HistorialPrecio[]
}
