import type { ReactNode } from 'react'
import { cn } from '@/components/ui/cn'
import type { TiendaCatalogoPublica } from '@/lib/catalogo/types'
import { CatalogoBarraPedido } from './CatalogoBarraPedido'
import { CatalogoHeader } from './CatalogoHeader'

export function CatalogoShell({
  tienda,
  slug,
  children,
  narrow = false,
  showBack = false,
  backHref,
  title,
  reserveBar = true,
}: {
  tienda: TiendaCatalogoPublica
  slug: string
  children: ReactNode
  narrow?: boolean
  showBack?: boolean
  backHref?: string
  title?: string
  reserveBar?: boolean
}) {
  return (
    <>
      <CatalogoHeader tienda={tienda} slug={slug} showBack={showBack} backHref={backHref} />
      <main
        className={cn(
          'mx-auto w-full px-4 py-6',
          narrow ? 'max-w-lg' : 'max-w-5xl',
          reserveBar && 'pb-24'
        )}
      >
        {title ? <h1 className="text-lg font-semibold text-fg mb-4">{title}</h1> : null}
        {children}
      </main>
      <CatalogoBarraPedido slug={slug} />
    </>
  )
}
