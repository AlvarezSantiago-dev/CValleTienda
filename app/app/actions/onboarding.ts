'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export interface DatosOnboarding {
  razon_social: string
  cuit: string
  telefono: string
  prefijo_ticket: string
  texto_pie: string
}

export async function completarOnboarding(datos: DatosOnboarding) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!perfil) redirect('/login')

  // Actualizar configuracion_tienda con datos del wizard
  const updateConfig: Record<string, unknown> = {}
  if (datos.razon_social.trim()) updateConfig.razon_social = datos.razon_social.trim()
  if (datos.cuit.trim())        updateConfig.cuit         = datos.cuit.trim()
  if (datos.texto_pie.trim())   updateConfig.texto_pie    = datos.texto_pie.trim()
  if (datos.prefijo_ticket.trim()) {
    updateConfig.prefijo_ticket = datos.prefijo_ticket.trim().toUpperCase().slice(0, 6)
  }

  if (Object.keys(updateConfig).length > 0) {
    await supabase
      .from('configuracion_tienda')
      .update(updateConfig)
      .eq('tienda_id', perfil.tienda_id)
  }

  // Actualizar tienda con teléfono si fue provisto
  if (datos.telefono.trim()) {
    await supabase
      .from('tiendas')
      .update({ telefono: datos.telefono.trim() })
      .eq('id', perfil.tienda_id)
  }

  // Marcar onboarding como completado
  await supabase.rpc('marcar_onboarding_completado')

  revalidatePath('/dashboard', 'layout')
  redirect('/dashboard')
}
