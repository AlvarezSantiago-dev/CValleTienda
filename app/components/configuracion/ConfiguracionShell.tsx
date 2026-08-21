'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Suspense, type ReactNode } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Tabs, type TabItem } from '@/components/ui/Tabs'
import { cn } from '@/components/ui/cn'

const NAV: { href: string; label: string; exact?: boolean }[] = [
  { href: '/configuracion', label: 'Mi negocio', exact: true },
  { href: '/configuracion/ticket', label: 'Ticket', exact: true },
  { href: '/configuracion/cobros', label: 'Cobros', exact: true },
  { href: '/configuracion/equipo', label: 'Equipo', exact: true },
  { href: '/configuracion/catalogo', label: 'Catálogo', exact: true },
  { href: '/configuracion/avanzado', label: 'Avanzado' },
]

const TAB_ITEMS: TabItem[] = NAV.map((n) => ({
  href: n.href,
  label: n.label,
  exact: n.exact,
}))

function isNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(href + '/')
}

function SideNav() {
  const pathname = usePathname()
  return (
    <nav aria-label="Secciones de configuración" className="sticky top-4 space-y-0.5">
      {NAV.map((item) => {
        const active = isNavActive(pathname, item.href, item.exact)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'block rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium transition-colors focus-ring',
              active
                ? 'bg-primary-soft text-fg-brand'
                : 'text-fg-muted hover:bg-surface-hover hover:text-fg'
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function MobileTabs() {
  return <Tabs items={TAB_ITEMS} variant="underline" className="mb-0" />
}

interface ConfiguracionShellProps {
  title: string
  description?: string
  breadcrumb?: ReactNode
  children: ReactNode
  /** Ancho del contenido (forms estrechos vs cobros full) */
  contentClassName?: string
}

export function ConfiguracionShell({
  title,
  description,
  breadcrumb,
  children,
  contentClassName = 'max-w-3xl',
}: ConfiguracionShellProps) {
  return (
    <div className="space-y-6 w-full min-w-0">
      <PageHeader
        className="mb-0"
        title={title}
        description={description}
        breadcrumb={breadcrumb}
      />

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        <aside className="hidden lg:block w-48 xl:w-52 shrink-0">
          <SideNav />
        </aside>

        <div className="lg:hidden -mx-1 px-1">
          <Suspense fallback={<div className="h-10 border-b border-border-default" />}>
            <MobileTabs />
          </Suspense>
        </div>

        <div className={cn('flex-1 min-w-0', contentClassName)}>{children}</div>
      </div>
    </div>
  )
}
