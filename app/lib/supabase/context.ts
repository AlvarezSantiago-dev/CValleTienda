// =============================================================
// lib/supabase/context.ts
// Contexto de tienda cacheado por request (React.cache).
// =============================================================

import { cache } from 'react'
import { requireAuthCtx } from '@/lib/supabase/require-ctx'
import { getPlanEfectivo, diasRestantesTrial } from '@/lib/planes/config'
import {
  tieneAcceso,
  diasRestantesAcceso,
  estadoAcceso,
  type EstadoAcceso,
} from '@/lib/planes/acceso'
import type { PlanTipo } from '@/lib/planes/config'

export interface ContextoTienda {
  userId: string
  tiendaId: string
  rubro: string
  nombre: string
  plan: PlanTipo
  planEfectivo: PlanTipo
  trial_hasta: string | null
  esTrial: boolean
  diasTrial: number
  acceso_hasta: string | null
  tieneAcceso: boolean
  diasAcceso: number
  estadoAcceso: EstadoAcceso
  /** Campos de perfil para shell / sidebar */
  perfilNombre: string
  perfilApellido: string | null
  perfilRol: string
}

export const getContextoTienda = cache(async (): Promise<ContextoTienda | null> => {
  try {
    const { supabase, userId, tiendaId, rol, nombre, apellido } = await requireAuthCtx()

    const { data: tienda } = await supabase
      .from('tiendas')
      .select('nombre, rubro, plan, trial_hasta, acceso_hasta')
      .eq('id', tiendaId)
      .maybeSingle()

    const plan = ((tienda as { plan?: string } | null)?.plan ?? 'basico') as PlanTipo
    const trial_hasta = (tienda as { trial_hasta?: string | null } | null)?.trial_hasta ?? null
    const acceso_hasta = (tienda as { acceso_hasta?: string | null } | null)?.acceso_hasta ?? null
    const planEfectivo = getPlanEfectivo(plan, trial_hasta)
    const esTrial = planEfectivo === 'pro' && plan !== 'pro'
    const diasTrial = diasRestantesTrial(trial_hasta)
    const accesoOk = tieneAcceso({ acceso_hasta, trial_hasta })
    const diasAcceso = diasRestantesAcceso(acceso_hasta)
    const estado = estadoAcceso({ acceso_hasta, trial_hasta })

    return {
      userId,
      tiendaId,
      rubro: (tienda as { rubro?: string } | null)?.rubro ?? 'generico',
      nombre: (tienda as { nombre?: string } | null)?.nombre ?? 'Mi Tienda',
      plan,
      planEfectivo,
      trial_hasta,
      esTrial,
      diasTrial,
      acceso_hasta,
      tieneAcceso: accesoOk,
      diasAcceso,
      estadoAcceso: estado,
      perfilNombre: nombre,
      perfilApellido: apellido,
      perfilRol: rol,
    }
  } catch {
    return null
  }
})
