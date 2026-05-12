// =============================================================
// lib/supabase/context.ts
// Contexto de tienda cacheado por request (React.cache).
// Evita múltiples roundtrips a Supabase dentro de un mismo render.
// =============================================================

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getPlanEfectivo, diasRestantesTrial } from '@/lib/planes/config'
import type { PlanTipo } from '@/lib/planes/config'

export interface ContextoTienda {
  userId:        string
  tiendaId:      string
  rubro:         string
  nombre:        string
  plan:          PlanTipo
  planEfectivo:  PlanTipo
  trial_hasta:   string | null
  esTrial:       boolean
  diasTrial:     number
}

export const getContextoTienda = cache(async (): Promise<ContextoTienda | null> => {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!perfil) return null

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('nombre, rubro, plan, trial_hasta')
    .eq('id', perfil.tienda_id)
    .maybeSingle()

  const plan        = ((tienda as { plan?: string } | null)?.plan ?? 'basico') as PlanTipo
  const trial_hasta = (tienda as { trial_hasta?: string | null } | null)?.trial_hasta ?? null
  const planEfectivo = getPlanEfectivo(plan, trial_hasta)
  const esTrial     = planEfectivo === 'pro' && plan !== 'pro'
  const diasTrial   = diasRestantesTrial(trial_hasta)

  return {
    userId:       auth.user.id,
    tiendaId:     perfil.tienda_id as string,
    rubro:        (tienda as { rubro?: string } | null)?.rubro ?? 'generico',
    nombre:       (tienda as { nombre?: string } | null)?.nombre ?? 'Mi Tienda',
    plan,
    planEfectivo,
    trial_hasta,
    esTrial,
    diasTrial,
  }
})
