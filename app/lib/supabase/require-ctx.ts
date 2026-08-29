import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export const requireAuthCtx = cache(async () => {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('No autenticado')
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id, rol, nombre, apellido, activo, onboarding_completado')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!perfil) throw new Error('Perfil no encontrado')
  return {
    supabase,
    userId: auth.user.id,
    tiendaId: perfil.tienda_id as string,
    rol: perfil.rol as string,
    nombre: perfil.nombre as string,
    apellido: (perfil.apellido as string | null) ?? null,
    activo: (perfil.activo as boolean) ?? true,
    onboardingCompletado: (perfil.onboarding_completado as boolean) ?? false,
  }
})
