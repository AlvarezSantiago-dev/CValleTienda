import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { SuperAdminPanel } from '@/components/superadmin/SuperAdminPanel'
import type { PlanTipo } from '@/lib/planes/config'

export const dynamic = 'force-dynamic'

export default async function SuperAdminPage() {
  // Auth con cliente normal
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.SUPERADMIN_EMAIL) {
    redirect('/dashboard')
  }

  // Datos con admin client (bypasea RLS — ve todas las tiendas)
  const admin = createAdminClient()

  const [tiendasRes, solicitudesRes, perfilesRes] = await Promise.all([
    admin
      .from('tiendas')
      .select('id, nombre, rubro, plan, trial_hasta, plan_activo_desde, created_at')
      .order('created_at', { ascending: false }),

    admin
      .from('solicitudes_upgrade')
      .select('id, tienda_id, mensaje, created_at, tiendas(nombre)')
      .eq('atendida', false)
      .order('created_at', { ascending: true }),

    // Dueños para mostrar nombre/apellido por tienda
    admin
      .from('perfiles')
      .select('tienda_id, nombre, apellido, rol')
      .in('rol', ['owner', 'admin']),
  ])

  const tiendas = tiendasRes.data ?? []
  const solicitudesRaw = solicitudesRes.data ?? []
  const perfiles = perfilesRes.data ?? []

  // Índices auxiliares
  const solicitudesPorTienda: Record<string, number> = {}
  for (const s of solicitudesRaw) {
    const tid = s.tienda_id as string
    solicitudesPorTienda[tid] = (solicitudesPorTienda[tid] ?? 0) + 1
  }

  // Owner principal por tienda (primer owner, si no, primer admin)
  const ownerPorTienda: Record<string, { nombre: string; apellido: string | null }> = {}
  for (const p of perfiles as Array<{ tienda_id: string; nombre: string; apellido: string | null; rol: string }>) {
    if (!ownerPorTienda[p.tienda_id] || p.rol === 'owner') {
      ownerPorTienda[p.tienda_id] = { nombre: p.nombre, apellido: p.apellido }
    }
  }

  const tiendasData = tiendas.map(t => ({
    id:                     t.id as string,
    nombre:                 t.nombre as string,
    rubro:                  t.rubro as string,
    plan:                   (t.plan ?? 'basico') as PlanTipo,
    trial_hasta:            (t.trial_hasta as string | null) ?? null,
    plan_activo_desde:      (t.plan_activo_desde as string | null) ?? null,
    created_at:             t.created_at as string,
    solicitudes_pendientes: solicitudesPorTienda[t.id as string] ?? 0,
    owner:                  ownerPorTienda[t.id as string] ?? null,
  }))

  const solicitudes = solicitudesRaw.map(s => {
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
      tiendas={tiendasData}
      solicitudes={solicitudes}
    />
  )
}
