import { createClient } from '@/lib/supabase/server'
import type { Categoria, Color, HistorialPrecio, KitComponente, Producto, Talla, VarianteProducto } from '@/types/database'

export interface ProductoListItem extends Producto {
  categoria: { id: string; nombre: string } | null
  stock_total: number
  variantes_count: number
  /** Primer pack habilitado en alguna variante, null si ninguna tiene pack */
  pack_info: { cantidad: number; precio: number } | null
}

export interface ProductoDetail extends Producto {
  categoria: Categoria | null
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
      *,
      categoria:categorias ( id, nombre ),
      variantes:variantes_producto ( stock_actual, pack_habilitado, pack_cantidad, pack_precio )
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

  const items: ProductoListItem[] = (data ?? []).map((row) => {
    const variantes = (row.variantes ?? []) as {
      stock_actual: number
      pack_habilitado: boolean
      pack_cantidad: number | null
      pack_precio: number | null
    }[]
    const stockTotal = variantes.reduce((acc, v) => acc + (v.stock_actual ?? 0), 0)
    const packVariante = variantes.find((v) => v.pack_habilitado && v.pack_cantidad && v.pack_precio)
    const pack_info = packVariante
      ? { cantidad: packVariante.pack_cantidad!, precio: Number(packVariante.pack_precio!) }
      : null
    // No incluir variantes en el shape final (es un agregado)
    const { variantes: _v, categoria, ...rest } = row as typeof row & {
      categoria: { id: string; nombre: string } | null
    }
    return {
      ...(rest as Producto),
      categoria,
      stock_total: stockTotal,
      variantes_count: variantes.length,
      pack_info,
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
