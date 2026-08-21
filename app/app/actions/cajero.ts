'use server'

// =============================================================
// actions/cajero.ts
// Actions mínimas y acotadas para el Cajero Hablado.
// =============================================================

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface ActionResult<T = unknown> {
  ok: boolean
  error?: string
  data?: T
}

async function requireCtx() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('No autenticado')
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id, rol')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!perfil) throw new Error('Perfil no encontrado')
  return {
    supabase,
    tiendaId: perfil.tienda_id as string,
    rol: perfil.rol as string,
  }
}

/**
 * Actualiza SOLO el precio de venta base de un producto.
 * Restringido a owner/admin — el cajero vendedor no cambia precios.
 * No toca precios por variante ni ningún otro campo.
 */
export async function actualizarPrecioVenta(
  productoId: string,
  nuevoPrecio: number
): Promise<ActionResult<{ anterior: number }>> {
  try {
    if (!productoId) return { ok: false, error: 'Falta el producto' }
    const precio = Number(nuevoPrecio)
    if (!Number.isFinite(precio) || precio <= 0) {
      return { ok: false, error: 'El precio debe ser mayor a 0' }
    }

    const { supabase, tiendaId, rol } = await requireCtx()
    if (rol !== 'owner' && rol !== 'admin') {
      return { ok: false, error: 'Solo el dueño o un administrador pueden cambiar precios' }
    }

    const { data: prod } = await supabase
      .from('productos')
      .select('id, precio_venta')
      .eq('id', productoId)
      .eq('tienda_id', tiendaId)
      .maybeSingle()
    if (!prod) return { ok: false, error: 'Producto no encontrado' }

    const anterior = Number((prod as { precio_venta: number | null }).precio_venta ?? 0)

    const { error } = await supabase
      .from('productos')
      .update({ precio_venta: precio })
      .eq('id', productoId)
      .eq('tienda_id', tiendaId)
    if (error) return { ok: false, error: error.message }

    revalidatePath('/productos')
    revalidatePath(`/productos/${productoId}`)
    revalidatePath('/pos')
    return { ok: true, data: { anterior } }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
