'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { PlanTipo } from '@/lib/planes/config'

// ----------------------------------------------------------------
// Guard helper: valida que el usuario sea el superadmin por email.
// ----------------------------------------------------------------
async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.SUPERADMIN_EMAIL) {
    redirect('/dashboard')
  }
  return { supabase, user }
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
// Extender el trial N días adicionales desde hoy.
// ----------------------------------------------------------------
export async function extenderTrial(
  tiendaId: string,
  dias: number,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase } = await assertSuperAdmin()

  // Leer trial_hasta actual
  const { data: tienda, error: readErr } = await supabase
    .from('tiendas')
    .select('trial_hasta')
    .eq('id', tiendaId)
    .maybeSingle()

  if (readErr) return { ok: false, error: readErr.message }

  const base = tienda?.trial_hasta
    ? new Date(tienda.trial_hasta as string)
    : new Date()

  const nuevaFecha = new Date(base)
  nuevaFecha.setDate(nuevaFecha.getDate() + dias)

  const { error } = await supabase
    .from('tiendas')
    .update({ trial_hasta: nuevaFecha.toISOString() })
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
