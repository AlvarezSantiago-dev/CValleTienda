import { createClient } from '@supabase/supabase-js'

/**
 * Cliente de Supabase con Service Role Key.
 * SOLO usar en server actions o API routes — NUNCA en client components.
 * Bypasea RLS: úsalo únicamente para operaciones admin (crear/eliminar usuarios).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
