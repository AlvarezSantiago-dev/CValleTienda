import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Callback de Supabase Auth.
 * Supabase redirige aquí después de que el usuario confirma su email.
 * Intercambia el `code` por una sesión activa y redirige al destino correcto.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Si el `next` es una ruta especial (ej. recuperar contraseña), siempre honrarla
      if (next.startsWith('/recuperar-password')) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      // Verificar si el usuario ya tiene tienda configurada
      const { data: auth } = await supabase.auth.getUser()
      if (auth.user) {
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('tienda_id')
          .eq('id', auth.user.id)
          .maybeSingle()

        if (perfil?.tienda_id) {
          // Ya tiene tienda → ir al dashboard
          return NextResponse.redirect(`${origin}/dashboard`)
        } else {
          // Sin tienda → onboarding
          return NextResponse.redirect(`${origin}/onboarding`)
        }
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Error: sin código o intercambio fallido (token expirado, ya usado, o PKCE mismatch)
  const errorMsg = code
    ? 'El enlace expiró o ya fue usado. Registrate de nuevo o pedí otro email de confirmación.'
    : 'Enlace de confirmación inválido. Intentá registrarte de nuevo.'
  return NextResponse.redirect(`${origin}/registro?error=${encodeURIComponent(errorMsg)}`)
}
