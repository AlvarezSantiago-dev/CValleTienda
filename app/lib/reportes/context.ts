import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

export const getReporteCtx = cache(async () => {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('No autenticado')
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!perfil) throw new Error('Perfil no encontrado')
  return { supabase, tiendaId: perfil.tienda_id as string }
})

export function rangoMes(anio: number, mes: number): { inicio: string; fin: string } {
  const inicio = new Date(anio, mes - 1, 1, 0, 0, 0, 0)
  const fin = new Date(anio, mes, 1, 0, 0, 0, 0)
  return { inicio: inicio.toISOString(), fin: fin.toISOString() }
}
