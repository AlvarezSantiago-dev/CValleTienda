'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import type { PlanTipo } from '@/lib/planes/config'

async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.SUPERADMIN_EMAIL) {
    redirect('/dashboard')
  }
  return { supabase: createAdminClient(), user }
}

function extenderDesde(baseIso: string | null | undefined, dias: number): string {
  const base = baseIso ? new Date(baseIso) : new Date()
  const desde = base > new Date() ? base : new Date()
  const nueva = new Date(desde)
  nueva.setDate(nueva.getDate() + dias)
  return nueva.toISOString()
}

export async function cambiarPlan(
  tiendaId: string,
  plan: PlanTipo,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await assertSuperAdmin()

  const update: Record<string, string | null> = {
    plan,
    plan_activo_desde: plan === 'pro' ? new Date().toISOString() : null,
  }

  if (plan === 'pro') {
    const { data: tienda } = await supabase
      .from('tiendas')
      .select('acceso_hasta')
      .eq('id', tiendaId)
      .maybeSingle()

    const acceso = tienda?.acceso_hasta as string | null | undefined
    const accesoVigente = acceso && new Date(acceso) > new Date()
    if (!accesoVigente) {
      update.acceso_hasta = extenderDesde(null, 30)
      update.ultimo_pago_at = new Date().toISOString()
    }
  }

  const { error } = await supabase
    .from('tiendas')
    .update(update)
    .eq('id', tiendaId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function extenderTrial(
  tiendaId: string,
  dias: number,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await assertSuperAdmin()

  const { data: tienda, error: readErr } = await supabase
    .from('tiendas')
    .select('trial_hasta')
    .eq('id', tiendaId)
    .maybeSingle()

  if (readErr) return { ok: false, error: readErr.message }

  const { error } = await supabase
    .from('tiendas')
    .update({ trial_hasta: extenderDesde(tienda?.trial_hasta as string | null, dias) })
    .eq('id', tiendaId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function setTrialFecha(
  tiendaId: string,
  fechaISO: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await assertSuperAdmin()
  const { error } = await supabase
    .from('tiendas')
    .update({ trial_hasta: fechaISO })
    .eq('id', tiendaId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function renovarAcceso(
  tiendaId: string,
  dias: number,
): Promise<{ ok: boolean; error?: string }> {
  if (!Number.isFinite(dias) || dias <= 0) {
    return { ok: false, error: 'Cantidad de días inválida' }
  }

  const { supabase } = await assertSuperAdmin()

  const { data: tienda, error: readErr } = await supabase
    .from('tiendas')
    .select('acceso_hasta')
    .eq('id', tiendaId)
    .maybeSingle()

  if (readErr) return { ok: false, error: readErr.message }

  const { error } = await supabase
    .from('tiendas')
    .update({
      acceso_hasta: extenderDesde(tienda?.acceso_hasta as string | null, dias),
      ultimo_pago_at: new Date().toISOString(),
    })
    .eq('id', tiendaId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function setAccesoHasta(
  tiendaId: string,
  fechaISO: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await assertSuperAdmin()

  const update: Record<string, string | null> = { acceso_hasta: fechaISO }
  if (fechaISO && new Date(fechaISO) > new Date()) {
    update.ultimo_pago_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('tiendas')
    .update(update)
    .eq('id', tiendaId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function marcarSolicitudAtendida(
  solicitudId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await assertSuperAdmin()
  const { error } = await supabase
    .from('solicitudes_upgrade')
    .update({ atendida: true })
    .eq('id', solicitudId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/**
 * One-shot: pone stock_actual = -1 (ilimitado) en todas las variantes
 * activas de la tienda (excluye kits/bundles). Solo despensa/carnicería.
 * Requiere confirmación exacta: "INFINITO".
 */
export async function migrarStockInfinitoTienda(
  tiendaId: string,
  confirmacion: string,
): Promise<{ ok: boolean; error?: string; actualizadas?: number; yaInfinitas?: number }> {
  const { supabase, user } = await assertSuperAdmin()

  if (confirmacion.trim().toUpperCase() !== 'INFINITO') {
    return { ok: false, error: 'Confirmación incorrecta. Escribí exactamente: INFINITO' }
  }

  const { data: tienda, error: errTienda } = await supabase
    .from('tiendas')
    .select('id, nombre, rubro')
    .eq('id', tiendaId)
    .maybeSingle()

  if (errTienda) return { ok: false, error: errTienda.message }
  if (!tienda) return { ok: false, error: 'Tienda no encontrada' }

  const rubro = (tienda as { rubro: string }).rubro
  if (rubro !== 'despensa' && rubro !== 'carniceria') {
    return {
      ok: false,
      error: `Stock infinito solo aplica a despensa/carnicería (rubro actual: ${rubro})`,
    }
  }

  // Variantes activas de productos activos, no kit/bundle, que aún no son -1
  const { data: variantes, error: errVar } = await supabase
    .from('variantes_producto')
    .select(
      'id, stock_actual, producto:productos!inner(id, activo, es_kit, es_bundle)'
    )
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .eq('producto.activo', true)
    .neq('stock_actual', -1)

  if (errVar) return { ok: false, error: errVar.message }

  const candidatas = ((variantes ?? []) as Array<Record<string, unknown>>).filter((v) => {
    const prod = (Array.isArray(v.producto) ? v.producto[0] : v.producto) as
      | Record<string, unknown>
      | null
    if (!prod) return false
    if (prod.es_kit === true || prod.es_bundle === true) return false
    return true
  })

  // Contar las que ya estaban en -1 (info)
  const { count: yaInfinitas } = await supabase
    .from('variantes_producto')
    .select('id', { count: 'exact', head: true })
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .eq('stock_actual', -1)

  if (candidatas.length === 0) {
    return {
      ok: true,
      actualizadas: 0,
      yaInfinitas: yaInfinitas ?? 0,
      error: undefined,
    }
  }

  const ids = candidatas.map((v) => v.id as string)
  const ahora = new Date().toISOString()

  const { error: errUpd } = await supabase
    .from('variantes_producto')
    .update({ stock_actual: -1, updated_at: ahora })
    .in('id', ids)
    .eq('tienda_id', tiendaId)

  if (errUpd) return { ok: false, error: errUpd.message }

  // Movimientos de auditoría en lotes
  const motivo = `Superadmin: migración stock ilimitado — ${(tienda as { nombre: string }).nombre}`
  const BATCH = 200
  for (let i = 0; i < candidatas.length; i += BATCH) {
    const slice = candidatas.slice(i, i + BATCH)
    const rows = slice.map((v) => ({
      tienda_id: tiendaId,
      variante_id: v.id as string,
      tipo: 'ajuste' as const,
      cantidad: -1 - Number(v.stock_actual),
      stock_anterior: Number(v.stock_actual),
      stock_posterior: -1,
      motivo,
      venta_id: null,
      usuario_id: user.id,
    }))
    const { error: errMov } = await supabase.from('movimientos_stock').insert(rows)
    if (errMov) {
      return {
        ok: false,
        error: `Stock actualizado pero falló el log de movimientos: ${errMov.message}`,
        actualizadas: candidatas.length,
      }
    }
  }

  return {
    ok: true,
    actualizadas: candidatas.length,
    yaInfinitas: yaInfinitas ?? 0,
  }
}

