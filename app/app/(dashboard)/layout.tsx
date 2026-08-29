import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { AvisoCajaCerrada } from '@/components/layout/AvisoCajaCerrada'
import { RubroProvider } from '@/components/layout/RubroProvider'
import { PlanProvider } from '@/components/layout/PlanProvider'
import { AccesoVencidoScreen } from '@/components/planes/AccesoVencidoScreen'
import { AvisoAccesoPorVencer } from '@/components/planes/AvisoAccesoPorVencer'
import { labelPlan } from '@/lib/planes/config'
import { existeSesionCajaAbierta } from '@/lib/caja/queries'
import { getContextoTienda } from '@/lib/supabase/context'
import type { Rubro } from '@/lib/rubro/config'
import type { Perfil, RolUsuario } from '@/types/database'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [ctx, cajaAbierta] = await Promise.all([getContextoTienda(), existeSesionCajaAbierta()])

  if (!ctx) redirect('/setup')

  const perfil: Perfil = {
    id: ctx.userId,
    tienda_id: ctx.tiendaId,
    nombre: ctx.perfilNombre,
    apellido: ctx.perfilApellido,
    rol: ctx.perfilRol as RolUsuario,
    activo: true,
    onboarding_completado: true,
    created_at: '',
    updated_at: '',
  }

  if (!ctx.tieneAcceso) {
    return (
      <AccesoVencidoScreen
        tiendaNombre={ctx.nombre}
        planLabel={labelPlan(ctx.planEfectivo, false)}
        accesoHasta={ctx.acceso_hasta ?? ctx.trial_hasta}
      />
    )
  }

  return (
    <PlanProvider
      plan={ctx.plan}
      planEfectivo={ctx.planEfectivo}
      trial_hasta={ctx.trial_hasta}
      esTrial={ctx.esTrial}
      diasTrial={ctx.diasTrial}
      acceso_hasta={ctx.acceso_hasta}
      tieneAcceso={ctx.tieneAcceso}
      diasAcceso={ctx.diasAcceso}
      estadoAcceso={ctx.estadoAcceso}
    >
      <RubroProvider rubro={ctx.rubro as Rubro}>
        <AppShell
          perfil={perfil}
          tiendaNombre={ctx.nombre}
          cajaAbierta={cajaAbierta}
          cajeroHabladoActivo={
            !!(
              process.env.ANTHROPIC_API_KEY ||
              process.env.ANTHROPOPEDIA_API_KEY ||
              process.env.OPENAI_API_KEY
            )
          }
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
