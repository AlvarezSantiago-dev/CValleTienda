'use client'

import { usePathname } from 'next/navigation'

/** Oculta el aviso del layout en rutas que ya tienen su propio banner de caja. */
export function AvisoCajaCerradaRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (pathname === '/dashboard' || pathname === '/caja' || pathname.startsWith('/caja/')) {
    return null
  }

  return <>{children}</>
}
