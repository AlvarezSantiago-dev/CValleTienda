'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/login?error=Completá todos los campos')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const msg = error.message === 'Invalid login credentials'
      ? 'Email o contraseña incorrectos'
      : 'Error al iniciar sesión. Intentá de nuevo.'
    redirect(`/login?error=${encodeURIComponent(msg)}`)
  }

  // Redirigir según rol: cajero (vendedor) va al POS, admin/owner al dashboard
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle()
    if (perfil?.rol === 'vendedor') redirect('/pos')
  }

  redirect('/dashboard')
}

export async function registroAction(formData: FormData) {
  const nombre = formData.get('nombre') as string
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const nombreTienda = formData.get('nombre_tienda') as string
  const rubro = formData.get('rubro') as string

  if (!nombre || !email || !password || !nombreTienda) {
    redirect('/registro?error=Completá todos los campos')
  }

  if (!rubro) {
    redirect('/registro?error=Seleccioná el tipo de negocio')
  }

  if (password.length < 8) {
    redirect('/registro?error=La contraseña debe tener al menos 8 caracteres')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nombre,
        nombre_tienda: nombreTienda,
        rubro,
        rol: 'owner',
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/api/auth/callback`,
    },
  })

  if (error) {
    const err = error as { code?: string; status?: number }
    console.error('[registroAction] Supabase signUp error:', error.message, 'status:', err.status, 'code:', err.code)
    const isRateLimit =
      error.status === 429 ||
      error.message.toLowerCase().includes('rate limit') ||
      error.message.toLowerCase().includes('security purposes') ||
      err.code === 'over_email_send_rate_limit'
    const msg = error.message.includes('already registered') || error.message.includes('User already registered')
      ? 'Ese email ya está registrado'
      : isRateLimit
        ? 'Demasiados intentos. Esperá unos minutos e intentá de nuevo.'
        : error.message.includes('Database error')
          ? 'Error al crear la tienda. Por favor contactá soporte.'
          : `Error al crear la cuenta. Intentá de nuevo.`
    redirect(`/registro?error=${encodeURIComponent(msg)}`)
  }

  // Si la sesión ya está activa (confirmación de email deshabilitada en Supabase)
  if (data.session) {
    redirect('/onboarding')
  }

  // Email de confirmación enviado → mostrar página intermedia
  redirect(`/confirmar-email?email=${encodeURIComponent(email)}`)
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function solicitarRecuperacionAction(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  if (!email) {
    redirect('/recuperar-password?error=Ingresá tu email')
  }

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/api/auth/callback?next=/recuperar-password/confirmar`,
  })

  // No revelar si el email existe o no (seguridad)
  redirect('/recuperar-password?ok=1')
}

export async function actualizarPasswordAction(formData: FormData) {
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (!password || password.length < 8) {
    redirect('/recuperar-password/confirmar?error=La contraseña debe tener al menos 8 caracteres')
  }
  if (password !== confirm) {
    redirect('/recuperar-password/confirmar?error=Las contraseñas no coinciden')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    const msg = error.message.includes('same password')
      ? 'La nueva contraseña debe ser diferente a la actual'
      : 'Error al actualizar la contraseña. El enlace puede haber expirado.'
    redirect(`/recuperar-password/confirmar?error=${encodeURIComponent(msg)}`)
  }

  redirect('/dashboard')
}
