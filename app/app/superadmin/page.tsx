import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SuperAdminPanel } from '@/components/superadmin/SuperAdminPanel'
import type { PlanTipo } from '@/lib/planes/config'

export const dynamic = 'force-dynamic'

export default async function SuperAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.SUPERADMIN_EMAIL) {
    redirect('/dashboard')
  }

  // Listar todas las tiendas
  const { data: tiendas } = await supabase
    .from('tiendas')
    .select('id, nombre, rubro, plan, trial_hasta, plan_activo_desde')
    .order('created_at', { ascending: false })

  // Solicitudes pendientes
  const { data: solicitudesRaw } = await supabase
    .from('solicitudes_upgrade')
    .select('id, tienda_id, mensaje, created_at, tiendas(nombre)')
    .eq('atendida', false)
    .order('created_at', { ascending: true })

  // Contar solicitudes pendientes por tienda
  const solicitudesPorTienda: Record<string, number> = {}
  for (const s of solicitudesRaw ?? []) {
    const tid = s.tienda_id as string
    solicitudesPorTienda[tid] = (solicitudesPorTienda[tid] ?? 0) + 1
  }

  const tiendasConSolicitudes = (tiendas ?? []).map(t => ({
    id:                     t.id as string,
    nombre:                 t.nombre as string,
    rubro:                  t.rubro as string,
    plan:                   (t.plan ?? 'basico') as PlanTipo,
    trial_hasta:            (t.trial_hasta as string | null) ?? null,
    plan_activo_desde:      (t.plan_activo_desde as string | null) ?? null,
    solicitudes_pendientes: solicitudesPorTienda[t.id as string] ?? 0,
  }))

  const solicitudes = (solicitudesRaw ?? []).map(s => {
    const tiendaRef = s.tiendas as { nombre?: string } | null
    return {
      id:            s.id as string,
      tienda_id:     s.tienda_id as string,
      tienda_nombre: tiendaRef?.nombre ?? '—',
      mensaje:       s.mensaje as string | null,
      created_at:    s.created_at as string,
    }
  })

  return (
    <SuperAdminPanel
      tiendas={tiendasConSolicitudes}
      solicitudes={solicitudes}
    />
  )
}
