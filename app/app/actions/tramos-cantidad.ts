'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { validarTramos, type TramoCantidad } from '@/lib/precios/tramos-cantidad'

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
    .select('tienda_id')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!perfil) throw new Error('Perfil no encontrado')
  return { supabase, tiendaId: perfil.tienda_id as string }
}

export async function guardarTramosProducto(
  productoId: string,
  tramos: TramoCantidad[]
): Promise<ActionResult> {
  try {
    if (!productoId) return { ok: false, error: 'Falta el producto' }
    const parsed = validarTramos(tramos)
    if (!parsed.ok) return { ok: false, error: parsed.error }

    const { supabase, tiendaId } = await requireCtx()
    const { data: prod } = await supabase
      .from('productos')
      .select('id')
      .eq('id', productoId)
      .eq('tienda_id', tiendaId)
      .maybeSingle()
    if (!prod) return { ok: false, error: 'Producto no encontrado' }

    const { error: errDel } = await supabase
      .from('producto_tramos_cantidad')
      .delete()
      .eq('producto_id', productoId)
      .eq('tienda_id', tiendaId)
    if (errDel) return { ok: false, error: errDel.message }

    if (parsed.tramos.length > 0) {
      const { error: errIns } = await supabase.from('producto_tramos_cantidad').insert(
        parsed.tramos.map((t) => ({
          tienda_id: tiendaId,
          producto_id: productoId,
          cantidad_desde: t.cantidad_desde,
          descuento_pct: t.descuento_pct,
        }))
      )
      if (errIns) return { ok: false, error: errIns.message }
    }

    revalidatePath('/productos')
    revalidatePath(`/productos/${productoId}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
