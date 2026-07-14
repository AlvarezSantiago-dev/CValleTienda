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
