'use server'

import { createClient } from '@/lib/supabase/server'
import { buscarPreciosConsulta, type PrecioConsulta } from '@/lib/precios/queries'

export async function buscarPrecios(query: string): Promise<{
  data: PrecioConsulta[] | null
  error: string | null
}> {
  if (!query?.trim()) return { data: [], error: null }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'No autenticado' }

  try {
    const data = await buscarPreciosConsulta(query.trim())
    return { data, error: null }
  } catch (e) {
    return { data: null, error: (e as Error).message }
  }
}
