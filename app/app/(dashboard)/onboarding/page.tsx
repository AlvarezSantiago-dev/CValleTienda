import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import type { Rubro } from '@/types/database'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id, onboarding_completado')
    .eq('id', user.id)
    .maybeSingle()

  if (!perfil) redirect('/login')

  // Si ya completó el onboarding, ir al dashboard
  if (perfil.onboarding_completado) redirect('/dashboard')

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('nombre, rubro')
    .eq('id', perfil.tienda_id)
    .maybeSingle()

  const { data: config } = await supabase
    .from('configuracion_tienda')
    .select('prefijo_ticket')
    .eq('tienda_id', perfil.tienda_id)
    .maybeSingle()

  return (
    <OnboardingWizard
      tiendaNombre={tienda?.nombre ?? 'Mi Tienda'}
      rubro={(tienda?.rubro ?? 'generico') as Rubro}
      prefijoActual={(config as { prefijo_ticket?: string } | null)?.prefijo_ticket ?? 'T'}
    />
  )
}
