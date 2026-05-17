import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Usar getSession() en vez de getUser() — lee la cookie sin hacer roundtrip de red.
  // Las server components y server actions usan getUser() para validación real.
  const { data: { session } } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname
  const isAuthRoute = pathname.startsWith('/login') ||
    pathname.startsWith('/registro') ||
    pathname.startsWith('/auth')
  const isPublicRoute = isAuthRoute ||
    pathname === '/' ||
    pathname === '/setup' ||
    pathname.startsWith('/recuperar-password') ||
    pathname.startsWith('/confirmar-email') ||
    pathname.startsWith('/api/auth/callback') ||
    pathname.startsWith('/api/auth/confirm')
  const isProtectedRoute = !isPublicRoute

  // Sin sesión en ruta protegida → redirigir a login
  if (!session && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Con sesión intentando entrar a login/registro → redirigir al dashboard
  if (session && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
