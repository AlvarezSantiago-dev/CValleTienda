import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rutas que el cajero (vendedor) NO puede acceder — redirige a /pos
// La ruta de devoluciones se permite porque el cajero debe poder registrar reembolsos/cambios.
const RUTAS_SOLO_ADMIN = [
  '/dashboard',
  '/productos',
  '/stock',
  '/clientes',
  '/remitos',
  '/reportes',
  '/graficos',
  '/configuracion',
  '/planes',
]

/** Redirects must carry the cookies (refresh / clear) written on supabaseResponse. */
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirectResponse = NextResponse.redirect(url)
  from.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))
  for (const header of ['Cache-Control', 'Expires', 'Pragma'] as const) {
    const value = from.headers.get(header)
    if (value) redirectResponse.headers.set(header, value)
  }
  return redirectResponse
}

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
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          if (headers) {
            Object.entries(headers).forEach(([key, value]) =>
              supabaseResponse.headers.set(key, value)
            )
          }
        },
      },
    }
  )

  // getClaims() verifica el JWT y refresca el access token si venció.
  // getSession() solo lee la cookie: una sesión muerta sigue viéndose "logueada"
  // y arma un loop /login ↔ /dashboard (ERR_TOO_MANY_REDIRECTS + 403 Session not found).
  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub as string | undefined

  const pathname = request.nextUrl.pathname
  const isAuthRoute = pathname.startsWith('/login') ||
    pathname.startsWith('/registro') ||
    pathname.startsWith('/auth')
  const isPublicRoute = isAuthRoute ||
    pathname === '/' ||
    pathname === '/setup' ||
    pathname === '/presentacion' ||
    pathname === '/terminos' ||
    pathname === '/privacidad' ||
    pathname === '/aviso-legal' ||
    pathname.startsWith('/recuperar-password') ||
    pathname.startsWith('/confirmar-email') ||
    pathname.startsWith('/api/auth/callback') ||
    pathname.startsWith('/api/auth/confirm') ||
    pathname.startsWith('/c/')
  const isProtectedRoute = !isPublicRoute

  // Sin sesión válida en ruta protegida → login (con cookies limpiadas si el refresh falló)
  if (!userId && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return redirectWithCookies(url, supabaseResponse)
  }

  // Sesión válida en login/registro → dashboard
  if (userId && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return redirectWithCookies(url, supabaseResponse)
  }

  // Protección de rutas solo-admin: si el usuario es cajero (vendedor), redirigir a /pos
  if (userId && isProtectedRoute) {
    const esRutaSoloAdmin = RUTAS_SOLO_ADMIN.some(
      (r) => pathname === r || pathname.startsWith(r + '/')
    )
    if (esRutaSoloAdmin) {
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol')
        .eq('id', userId)
        .maybeSingle()

      if (perfil?.rol === 'vendedor') {
        const url = request.nextUrl.clone()
        url.pathname = '/pos'
        return redirectWithCookies(url, supabaseResponse)
      }
    }
  }

  return supabaseResponse
}
