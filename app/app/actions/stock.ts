'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { esStockInfinito, esStockValido, STOCK_INFINITO } from '@/lib/stock/infinito'
import { rubroPermiteStockInfinito } from '@/lib/rubro/config'

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
    userId: auth.user.id,
  }
}

function traducirError(msg?: string | null): string {
  if (!msg) return 'Error desconocido'
  if (msg.includes('Stock resultante negativo'))
    return 'El ajuste dejaría el stock en negativo'
  if (msg.includes('stock ilimitado'))
    return 'Producto con stock ilimitado; usá ajuste para salir de ilimitado'
  if (msg.includes('Variante no encontrada')) return 'Variante no encontrada'
  if (msg.includes('Motivo es obligatorio')) return 'El motivo es obligatorio'
  if (msg.includes('row-level security') || msg.includes('permiso denegado'))
    return 'No tenés permisos para esta operación'
  if (msg.includes('La variante no pertenece')) return 'La variante no pertenece a tu tienda'
  return msg
}

async function getRubroTienda(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tiendaId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('tiendas')
    .select('rubro')
    .eq('id', tiendaId)
    .maybeSingle()
  return (data as { rubro?: string } | null)?.rubro ?? null
}

function revalidarTodo(varianteId: string) {
  revalidatePath('/stock')
  revalidatePath('/stock/movimientos')
  revalidatePath(`/stock/${varianteId}`)
  revalidatePath('/productos')
  revalidatePath('/pos')
}

export interface IngresarStockInput {
  variante_id: string
  cantidad: number
  motivo: string
  /** Si se indica, actualiza el precio de compra de la variante (nuevo lote). */
  precio_compra?: number
}

export async function ingresarStock(
  input: IngresarStockInput
): Promise<ActionResult<{ movimiento_id: string }>> {
  try {
    if (!input.variante_id) return { ok: false, error: 'Falta la variante' }
    const cantidad = Number(input.cantidad)
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      return { ok: false, error: 'La cantidad debe ser mayor a 0' }
    }
    const motivo = input.motivo?.trim() ?? ''
    if (!motivo) return { ok: false, error: 'El motivo es obligatorio' }

    const { supabase, tiendaId } = await requireCtx()

    const { data: varStock } = await supabase
      .from('variantes_producto')
      .select('stock_actual')
      .eq('id', input.variante_id)
      .eq('tienda_id', tiendaId)
      .maybeSingle()
    if (esStockInfinito(Number((varStock as { stock_actual?: number } | null)?.stock_actual))) {
      return {
        ok: false,
        error: 'Producto con stock ilimitado; usá ajuste para salir de ilimitado',
      }
    }

    const { data, error } = await supabase.rpc('ajustar_stock_variante', {
      p_variante_id: input.variante_id,
      p_tipo: 'entrada',
      p_cantidad_delta: cantidad,
      p_motivo: motivo,
    })

    if (error) return { ok: false, error: traducirError(error.message) }

    // Actualizar precio de compra si se indicó uno nuevo
    if (input.precio_compra != null && Number(input.precio_compra) > 0) {
      // precio_compra vive en `productos`, no en `variantes_producto`.
      // Primero obtenemos el producto_id de la variante.
      const { data: varRow } = await supabase
        .from('variantes_producto')
        .select('producto_id')
        .eq('id', input.variante_id)
        .eq('tienda_id', tiendaId)
        .maybeSingle()

      if (varRow?.producto_id) {
        await supabase
          .from('productos')
          .update({ precio_compra: Number(input.precio_compra) })
          .eq('id', varRow.producto_id)
          .eq('tienda_id', tiendaId)
      }
    }

    revalidarTodo(input.variante_id)
    return { ok: true, data: { movimiento_id: data as string } }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export interface AjustarStockInput {
  variante_id: string
  nuevo_stock: number
  motivo: string
}

export async function ajustarStock(
  input: AjustarStockInput
): Promise<ActionResult<{ movimiento_id: string | null; delta: number }>> {
  try {
    if (!input.variante_id) return { ok: false, error: 'Falta la variante' }
    const nuevoStock = Number(input.nuevo_stock)
    if (!Number.isFinite(nuevoStock) || !esStockValido(nuevoStock)) {
      return { ok: false, error: 'El stock debe ser ≥ 0, o -1 para ilimitado' }
    }
    const motivo = input.motivo?.trim() ?? ''
    if (!motivo) return { ok: false, error: 'El motivo es obligatorio' }

    const { supabase, tiendaId } = await requireCtx()

    if (nuevoStock === STOCK_INFINITO) {
      const rubro = await getRubroTienda(supabase, tiendaId)
      if (!rubroPermiteStockInfinito(rubro)) {
        return {
          ok: false,
          error: 'Stock ilimitado (-1) solo está disponible para despensa y carnicería',
        }
      }
    }

    // Leer stock actual para calcular delta
    const { data: variante, error: errVar } = await supabase
      .from('variantes_producto')
      .select('stock_actual')
      .eq('tienda_id', tiendaId)
      .eq('id', input.variante_id)
      .maybeSingle()

    if (errVar) return { ok: false, error: traducirError(errVar.message) }
    if (!variante) return { ok: false, error: 'Variante no encontrada' }

    const stockActual = Number((variante as { stock_actual: number }).stock_actual)
    const delta = nuevoStock - stockActual

    if (delta === 0) {
      return {
        ok: true,
        data: { movimiento_id: null, delta: 0 },
        error: 'Sin cambios — el stock ya era ' + nuevoStock,
      }
    }

    const { data, error } = await supabase.rpc('ajustar_stock_variante', {
      p_variante_id: input.variante_id,
      p_tipo: 'ajuste',
      p_cantidad_delta: delta,
      p_motivo: motivo,
    })

    if (error) return { ok: false, error: traducirError(error.message) }

    revalidarTodo(input.variante_id)
    return { ok: true, data: { movimiento_id: data as string, delta } }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}
