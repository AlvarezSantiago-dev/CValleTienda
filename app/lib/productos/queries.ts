import { createClient } from '@/lib/supabase/server'
import type { Categoria, Color, Producto, Talla, VarianteProducto } from '@/types/database'

export interface ProductoListItem extends Producto {
  categoria: { id: string; nombre: string } | null
  stock_total: number
  variantes_count: number
}

export interface ProductoDetail extends Producto {
  categoria: Categoria | null
  variantes: (VarianteProducto & {
    talla: Pick<Talla, 'id' | 'nombre'> | null
    color: Pick<Color, 'id' | 'nombre' | 'hex_color'> | null
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
      variantes:variantes_producto ( stock_actual )
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
    const variantes = (row.variantes ?? []) as { stock_actual: number }[]
    const stockTotal = variantes.reduce((acc, v) => acc + (v.stock_actual ?? 0), 0)
    // No incluir variantes en el shape final (es un agregado)
    const { variantes: _v, categoria, ...rest } = row as typeof row & {
      categoria: { id: string; nombre: string } | null
    }
    return {
      ...(rest as Producto),
      categoria,
      stock_total: stockTotal,
      variantes_count: variantes.length,
    }
  })

  return { items, total: count ?? 0, page, pageSize }
}

/**
 * Obtiene un producto con todas sus variantes, talla y color resueltos.
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

  return data as unknown as ProductoDetail
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
