import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Callback alternativo al PKCE que usa token_hash.
 *
 * A diferencia de /api/auth/callback (que requiere el code verifier PKCE en la
 * cookie del mismo browser), este endpoint verifica el token directamente con
 * supabase.auth.verifyOtp() — funciona aunque el email se abra en otro browser
 * o en el in-app browser de Gmail/Outlook.
 *
 * Para activarlo, cambiar los email templates en Supabase Dashboard:
 *   Confirm signup → link a /api/auth/confirm?token_hash={{ .TokenHash }}&type=signup
 *   Reset Password → link a /api/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })

    if (!error) {
      if (type === 'recovery') {
        // Contraseña: ir al formulario de nueva contraseña
        return NextResponse.redirect(`${origin}/recuperar-password/confirmar`)
      }

      // Signup/email_change: verificar si el usuario tiene tienda
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('tienda_id')
          .eq('id', user.id)
          .maybeSingle()

        return NextResponse.redirect(
          `${origin}${perfil?.tienda_id ? '/dashboard' : '/onboarding'}`
        )
      }

      return NextResponse.redirect(`${origin}/onboarding`)
    }

    // Token expirado o ya usado
    const destino = type === 'recovery' ? '/recuperar-password' : '/registro'
    const msg = 'El enlace expiró o ya fue usado. Intentá de nuevo.'
    return NextResponse.redirect(`${origin}${destino}?error=${encodeURIComponent(msg)}`)
  }

  // Parámetros faltantes
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('Enlace inválido.')}`
  )
}
