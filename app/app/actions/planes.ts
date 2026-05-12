'use server'

import { createClient } from '@/lib/supabase/server'
import { getContextoTienda } from '@/lib/supabase/context'

export async function solicitarUpgrade(mensaje?: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getContextoTienda()
  if (!ctx) return { ok: false, error: 'No autenticado' }

  if (ctx.planEfectivo === 'pro' && !ctx.esTrial) {
    return { ok: false, error: 'Ya tenés el plan Pro activo' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('solicitudes_upgrade')
    .insert({
      tienda_id:   ctx.tiendaId,
      plan_pedido: 'pro',
      mensaje:     mensaje ?? null,
    })

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
