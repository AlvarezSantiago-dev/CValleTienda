'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import type { PlanTipo } from '@/lib/planes/config'

// ----------------------------------------------------------------
// Guard: verifica email superadmin; devuelve cliente admin (bypass RLS).
// ----------------------------------------------------------------
async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.SUPERADMIN_EMAIL) {
    redirect('/dashboard')
  }
  // Admin client para operar en tiendas (RLS bloquea plan/trial a usuarios normales)
  return { supabase: createAdminClient(), user }
}

// ----------------------------------------------------------------
// Cambiar el plan de una tienda (basico | pro).
// ----------------------------------------------------------------
export async function cambiarPlan(
  tiendaId: string,
  plan: PlanTipo,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await assertSuperAdmin()
  const { error } = await supabase
    .from('tiendas')
    .update({
      plan,
      plan_activo_desde: plan === 'pro' ? new Date().toISOString() : null,
    })
    .eq('id', tiendaId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ----------------------------------------------------------------
// Extender el trial N dÃ­as adicionales desde hoy (o desde trial_hasta actual).
// ----------------------------------------------------------------
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

  const base = tienda?.trial_hasta
    ? new Date(tienda.trial_hasta as string)
    : new Date()
  // Si ya venciÃ³, extender desde hoy
  const desde = base > new Date() ? base : new Date()
  const nuevaFecha = new Date(desde)
  nuevaFecha.setDate(nuevaFecha.getDate() + dias)

  const { error } = await supabase
    .from('tiendas')
    .update({ trial_hasta: nuevaFecha.toISOString() })
    .eq('id', tiendaId)

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

// ----------------------------------------------------------------
// Establecer una fecha exacta de trial_hasta (o null para quitar).
// ----------------------------------------------------------------
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

// ----------------------------------------------------------------
// Marcar una solicitud de upgrade como atendida.
// ----------------------------------------------------------------
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


