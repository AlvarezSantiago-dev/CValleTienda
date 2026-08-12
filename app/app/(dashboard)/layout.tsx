import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { AvisoCajaCerrada } from '@/components/layout/AvisoCajaCerrada'
import { RubroProvider } from '@/components/layout/RubroProvider'
import { PlanProvider } from '@/components/layout/PlanProvider'
import { AccesoVencidoScreen } from '@/components/planes/AccesoVencidoScreen'
import { AvisoAccesoPorVencer } from '@/components/planes/AvisoAccesoPorVencer'
import { getPlanEfectivo, diasRestantesTrial, labelPlan } from '@/lib/planes/config'
import {
  tieneAcceso,
  diasRestantesAcceso,
  estadoAcceso,
} from '@/lib/planes/acceso'
import { obtenerSesionAbiertaLite } from '@/lib/caja/queries'
import type { Rubro } from '@/lib/rubro/config'
import type { PlanTipo } from '@/lib/planes/config'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/setup')

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('id, nombre, logo_url, rubro, plan, trial_hasta, acceso_hasta')
    .eq('id', perfil.tienda_id)
    .single()

  const plan         = ((tienda as { plan?: string } | null)?.plan ?? 'basico') as PlanTipo
  const trial_hasta  = (tienda as { trial_hasta?: string | null } | null)?.trial_hasta ?? null
  const acceso_hasta = (tienda as { acceso_hasta?: string | null } | null)?.acceso_hasta ?? null
  const planEfectivo = getPlanEfectivo(plan, trial_hasta)
  const esTrial      = planEfectivo === 'pro' && plan !== 'pro'
  const diasTrial    = diasRestantesTrial(trial_hasta)
  const accesoOk     = tieneAcceso({ acceso_hasta, trial_hasta })
  const diasAcceso   = diasRestantesAcceso(acceso_hasta)
  const estado       = estadoAcceso({ acceso_hasta, trial_hasta })

  let cajaAbierta = false
  try {
    const sesion = await obtenerSesionAbiertaLite()
    cajaAbierta = !!sesion
  } catch {
    cajaAbierta = false
  }

  if (!accesoOk) {
    return (
      <AccesoVencidoScreen
        tiendaNombre={(tienda as { nombre?: string } | null)?.nombre ?? 'Mi Tienda'}
        planLabel={labelPlan(planEfectivo, false)}
        accesoHasta={acceso_hasta ?? trial_hasta}
      />
    )
  }

  return (
    <PlanProvider
      plan={plan}
      planEfectivo={planEfectivo}
      trial_hasta={trial_hasta}
      esTrial={esTrial}
      diasTrial={diasTrial}
      acceso_hasta={acceso_hasta}
      tieneAcceso={accesoOk}
      diasAcceso={diasAcceso}
      estadoAcceso={estado}
    >
      <RubroProvider rubro={(tienda?.rubro ?? 'generico') as Rubro}>
        <AppShell
          perfil={perfil}
          tiendaNombre={tienda?.nombre ?? 'Mi Tienda'}
          cajaAbierta={cajaAbierta}
        >
          <AvisoAccesoPorVencer />
          <AvisoCajaCerrada />
          <Toaster
            position="top-center"
            richColors
            closeButton
            offset={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}
            mobileOffset={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}
            toastOptions={{
              classNames: {
                toast:
                  'bg-surface text-fg border border-border-default shadow-md rounded-[var(--radius-lg)]',
                title: 'text-fg font-medium',
                description: 'text-fg-muted',
                actionButton: 'bg-primary text-primary-fg',
                cancelButton: 'bg-surface-sunken text-fg-muted',
                closeButton: 'bg-surface border-border-default text-fg-muted',
              },
            }}
          />
          <main
            data-app-main-scroll
            className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-clip min-h-0 min-w-0 max-w-full print:p-0"
          >
            {children}
          </main>
        </AppShell>
      </RubroProvider>
    </PlanProvider>
  )
}
