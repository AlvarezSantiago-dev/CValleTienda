'use server'

import { createClient } from '@/lib/supabase/server'

export interface PrecioProducto {
  id: string
  nombre: string
  precio_venta: number
  stock_actual: number | null
  unidad: string | null
  codigo_barras: string | null
}

export async function buscarPrecios(query: string): Promise<{ data: PrecioProducto[] | null; error: string | null }> {
  if (!query || query.trim().length < 1) return { data: [], error: null }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  const q = query.trim()

  // Búsqueda por código de barras exacto O por nombre parcial
  const { data, error } = await supabase
    .from('productos')
    .select('id, nombre, precio_venta, stock_actual, unidad, codigo_barras')
    .eq('activo', true)
    .or(`nombre.ilike.%${q}%,codigo_barras.eq.${q}`)
    .order('nombre', { ascending: true })
    .limit(40)

  if (error) return { data: null, error: error.message }
  return { data: data as PrecioProducto[], error: null }
}
