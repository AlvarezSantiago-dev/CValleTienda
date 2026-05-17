import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { AvisoCajaCerrada } from '@/components/layout/AvisoCajaCerrada'
import { RubroProvider } from '@/components/layout/RubroProvider'
import { PlanProvider } from '@/components/layout/PlanProvider'
import { getPlanEfectivo, diasRestantesTrial } from '@/lib/planes/config'
import type { Rubro } from '@/lib/rubro/config'
import type { PlanTipo } from '@/lib/planes/config'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Consultas separadas para evitar recursión de RLS
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/setup')

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('id, nombre, logo_url, rubro, plan, trial_hasta')
    .eq('id', perfil.tienda_id)
    .single()

  const plan        = ((tienda as { plan?: string } | null)?.plan ?? 'basico') as PlanTipo
  const trial_hasta = (tienda as { trial_hasta?: string | null } | null)?.trial_hasta ?? null
  const planEfectivo = getPlanEfectivo(plan, trial_hasta)
  const esTrial     = planEfectivo === 'pro' && plan !== 'pro'
  const diasTrial   = diasRestantesTrial(trial_hasta)

  return (
    <PlanProvider
      plan={plan}
      planEfectivo={planEfectivo}
      trial_hasta={trial_hasta}
      esTrial={esTrial}
      diasTrial={diasTrial}
    >
      <RubroProvider rubro={(tienda?.rubro ?? 'generico') as Rubro}>
        <AppShell perfil={perfil} tiendaNombre={tienda?.nombre ?? 'Mi Tienda'}>
          <AvisoCajaCerrada />
          <Toaster position="bottom-right" richColors closeButton />
          <main className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden print:p-0">
            {children}
          </main>
        </AppShell>
      </RubroProvider>
    </PlanProvider>
  )
}
