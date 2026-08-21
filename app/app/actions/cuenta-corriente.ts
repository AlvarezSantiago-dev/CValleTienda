'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { registrarCobroRemito } from '@/app/actions/remitos'
import { hoyArgentinaYmd } from '@/lib/datetime'
import { reconciliarSaldoCcCliente } from '@/lib/cc/sync-cargos'

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
    rol: perfil.rol as string,
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

/**
 * Alinea saldo_cc a remitos CC pendientes y corrige cargos duplicados
 * (pedido + remito del mismo saldo).
 */
export async function sincronizarCargosRemitosCliente(
  clienteId: string
): Promise<ActionResult<{ saldoCc: number }>> {
  try {
    if (!clienteId) return { ok: false, error: 'Falta el cliente' }
    const { supabase, tiendaId, userId } = await requireCtx()
    const sync = await reconciliarSaldoCcCliente(supabase, {
      tiendaId,
      userId,
      clienteId,
    })
    if (sync.error) return { ok: false, error: sync.error }

    revalidatePath(`/clientes/${clienteId}`)
    revalidatePath('/clientes')
    revalidatePath('/dashboard')
    revalidatePath('/', 'layout')
    return { ok: true, data: { saldoCc: sync.saldoCc ?? 0 } }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/**
 * Cobra deuda de un cliente. Imputa a remitos pendientes (FIFO o IDs)
 * vía registrarCobroRemito (único writer del ledger). El resto va como pago suelto.
 */
export async function registrarCobroCliente(input: {
  clienteId: string
  monto: number
  cuentaFondoId?: string | null
  remitoIds?: string[]
  medioPago?: string | null
}): Promise<ActionResult<{ movimientoId?: string }>> {
  try {
    const monto = round2(Number(input.monto))
    if (!input.clienteId) return { ok: false, error: 'Falta el cliente' }
    if (!Number.isFinite(monto) || monto <= 0) {
      return { ok: false, error: 'El monto debe ser mayor a cero' }
    }

    const { supabase, tiendaId, userId, rol } = await requireCtx()
    if (!['owner', 'admin'].includes(rol)) {
      return { ok: false, error: 'Solo el dueño o administrador puede registrar cobros' }
    }

    const { data: cliente } = await supabase
      .from('clientes')
      .select('id, saldo_cc')
      .eq('id', input.clienteId)
      .eq('tienda_id', tiendaId)
      .maybeSingle()

    if (!cliente) return { ok: false, error: 'Cliente no encontrado' }
    const deuda = Number((cliente as { saldo_cc: number }).saldo_cc ?? 0)
    if (monto - 0.01 > deuda) {
      return { ok: false, error: `El cobro ($${monto}) supera la deuda ($${deuda})` }
    }

    let q = supabase
      .from('remitos')
      .select('id, numero_remito, monto_total, monto_cobrado')
      .eq('tienda_id', tiendaId)
      .eq('cliente_id', input.clienteId)
      .eq('tipo', 'cuenta_corriente')
      .eq('estado_cobro', 'pendiente')
      .neq('estado', 'anulado')
      .order('created_at', { ascending: true })

    if (input.remitoIds && input.remitoIds.length > 0) {
      q = q.in('id', input.remitoIds)
    }

    const { data: remitos } = await q
    const fecha = hoyArgentinaYmd()
    let restante = monto
    let movimientoId: string | undefined

    for (const r of (remitos ?? []) as Array<{
      id: string
      monto_total: number
      monto_cobrado: number
    }>) {
      if (restante <= 0.01) break
      const pend = round2(Number(r.monto_total) - Number(r.monto_cobrado ?? 0))
      if (pend <= 0.01) continue
      const aplicar = Math.min(pend, restante)
      const res = await registrarCobroRemito(r.id, aplicar, fecha)
      if (!res.ok) return { ok: false, error: res.error ?? 'Error al imputar remito' }
      if (res.movimientoId) movimientoId = res.movimientoId
      restante = round2(restante - aplicar)
    }

    if (restante > 0.01) {
      const { error } = await supabase.rpc('registrar_movimiento_cc', {
        p_tienda_id: tiendaId,
        p_cliente_id: input.clienteId,
        p_tipo: 'pago',
        p_monto: restante,
        p_concepto: 'Cobro a cuenta',
        p_venta_id: null,
        p_remito_id: null,
        p_usuario_id: userId,
      })
      if (error) return { ok: false, error: error.message }
    }

    const { data: lastPago } = await supabase
      .from('movimientos_cc')
      .select('id')
      .eq('tienda_id', tiendaId)
      .eq('cliente_id', input.clienteId)
      .eq('tipo', 'pago')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    movimientoId = (lastPago as { id: string } | null)?.id ?? movimientoId
    if (movimientoId && input.medioPago) {
      await supabase
        .from('movimientos_cc')
        .update({ medio_pago: input.medioPago })
        .eq('id', movimientoId)
        .eq('tienda_id', tiendaId)
    }

    if (input.cuentaFondoId) {
      const { data: sesion } = await supabase
        .from('sesiones_caja')
        .select('id')
        .eq('tienda_id', tiendaId)
        .eq('estado', 'abierta')
        .maybeSingle()

      if (sesion) {
        await supabase.rpc('registrar_movimiento_fondo', {
          p_cuenta_fondo_id: input.cuentaFondoId,
          p_tipo: 'ingreso',
          p_concepto: 'Cobro cuenta corriente',
          p_monto: monto,
          p_venta_id: null,
          p_usuario_id: userId,
        })
      }
    }

    revalidatePath('/clientes')
    revalidatePath(`/clientes/${input.clienteId}`)
    revalidatePath('/remitos')
    revalidatePath('/dashboard')
    revalidatePath('/caja')
    return { ok: true, data: { movimientoId } }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
