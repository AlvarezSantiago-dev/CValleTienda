'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, LogOut, X } from 'lucide-react'
import type { Perfil, RolUsuario } from '@/types/database'
import { logoutAction } from '@/app/actions/auth'
import { usePlan } from '@/components/layout/PlanProvider'
import { useRubro } from '@/components/layout/RubroProvider'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/components/ui/cn'
import { filterNavGroups, NAV_GROUPS } from './nav-config'

const STORAGE_KEY = 'cv-sidebar-collapsed'

interface SidebarV2Props {
  perfil: Perfil
  tiendaNombre: string
  onClose?: () => void
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

export function SidebarV2({
  perfil,
  tiendaNombre,
  onClose,
  collapsed: collapsedProp,
  onCollapsedChange,
}: SidebarV2Props) {
  const pathname = usePathname()
  const { planEfectivo, esTrial, diasTrial } = usePlan()
  const { usarRemitos, usarDevoluciones, usarPedidoCc } = useRubro()
  const esCajero = perfil.rol === 'vendedor'

  const [collapsedInternal, setCollapsedInternal] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const apply = () => setIsDesktop(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === '1') {
        setCollapsedInternal(true)
        onCollapsedChange?.(true)
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleCollapsed() {
    if (!isDesktop) return
    const next = !collapsed
    setCollapsedInternal(next)
    onCollapsedChange?.(next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  // En móvil/tablet el drawer siempre va expandido
  const collapsed = isDesktop ? (collapsedProp ?? collapsedInternal) : false

  const navGroups = filterNavGroups(NAV_GROUPS, {
    rol: perfil.rol as RolUsuario,
    usarRemitos,
    usarDevoluciones,
    usarPedidoCc,
  })

  return (
    <aside
      id="app-sidebar"
      className={cn(
        'shrink-0 bg-surface border-r border-border-subtle flex flex-col h-full',
        'transition-[width] duration-(--duration-base) ease-standard',
        'shadow-lg lg:shadow-none',
        collapsed ? 'w-[4.25rem]' : 'w-56'
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'border-b border-border-subtle flex items-center gap-3',
          collapsed ? 'px-3 py-4 justify-center' : 'px-4 py-4'
        )}
      >
        <div className="w-8 h-8 bg-fg rounded-[var(--radius-md)] flex items-center justify-center shrink-0">
          <span className="text-fg-inverse text-sm font-bold tracking-tight">C</span>
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg truncate leading-tight">{tiendaNombre}</p>
            <p className="text-xs text-fg-subtle leading-tight">CValleTienda</p>
          </div>
        )}
        {!collapsed && !esCajero && (
          <Link
            href="/planes"
            onClick={onClose}
            className={cn(
              'ml-auto shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-opacity hover:opacity-80',
              esTrial
                ? 'bg-warning-soft text-warning-soft-fg'
                : planEfectivo === 'pro'
                  ? 'bg-primary-soft text-primary-soft-fg'
                  : 'bg-surface-sunken text-fg-muted'
            )}
          >
            {esTrial ? `TRIAL ${diasTrial}d` : planEfectivo === 'pro' ? 'PRO' : 'BÁSICO'}
          </Link>
        )}
        {/* Cerrar drawer — solo móvil */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className={cn(
              'lg:hidden shrink-0 flex items-center justify-center',
              'h-11 w-11 -mr-1 rounded-[var(--radius-md)] text-fg-subtle',
              'hover:bg-surface-hover hover:text-fg cursor-pointer focus-ring',
              collapsed && 'ml-0'
            )}
          >
            <X size={18} aria-hidden />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className={cn('flex-1 overflow-y-auto py-3', collapsed ? 'px-2' : 'px-3')} aria-label="Principal">
        <div className="space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle px-2.5 mb-1.5">
                  {group.label}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + '/')
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        'group flex items-center gap-2.5 rounded-[var(--radius-md)] text-sm transition-colors duration-(--duration-fast) focus-ring',
                        'min-h-11 lg:min-h-0',
                        collapsed ? 'justify-center px-0 py-2.5' : 'pl-2.5 pr-3 py-2.5 lg:py-2',
                        isActive
                          ? 'bg-primary-soft text-primary-soft-fg font-semibold'
                          : 'text-fg-muted hover:bg-surface-hover hover:text-fg'
                      )}
                    >
                      <Icon
                        size={18}
                        className={cn(
                          'shrink-0',
                          isActive ? 'text-fg-brand' : 'text-fg-subtle group-hover:text-fg-muted'
                        )}
                        aria-hidden
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {collapsed && <span className="sr-only">{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Collapse (desktop) */}
      <div className="hidden lg:flex px-2 pb-1">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-[var(--radius-md)] text-fg-subtle hover:bg-surface-hover hover:text-fg-muted text-xs cursor-pointer focus-ring"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span>Colapsar</span>}
        </button>
      </div>

      {/* User + logout */}
      <div className={cn('border-t border-border-subtle', collapsed ? 'px-2 py-3' : 'px-3 py-3')}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5 px-1.5 py-1.5 mb-1">
            <Avatar name={perfil.nombre} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-fg truncate leading-tight">{perfil.nombre}</p>
              <p className="text-xs text-fg-subtle capitalize leading-tight">
                {perfil.rol === 'vendedor' ? 'Cajero' : perfil.rol}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-2" title={perfil.nombre}>
            <Avatar name={perfil.nombre} size="sm" />
          </div>
        )}
        <form action={logoutAction}>
          <button
            type="submit"
            title="Cerrar sesión"
            className={cn(
              'w-full flex items-center gap-2 rounded-[var(--radius-md)] text-xs text-fg-subtle',
              'hover:bg-danger-soft hover:text-danger-soft-fg transition-colors cursor-pointer focus-ring',
              'min-h-11 lg:min-h-0',
              collapsed ? 'justify-center py-2' : 'pl-2 pr-3 py-2.5 lg:py-2'
            )}
          >
            <LogOut size={14} aria-hidden />
            {!collapsed && <span>Cerrar sesión</span>}
            {collapsed && <span className="sr-only">Cerrar sesión</span>}
          </button>
        </form>
      </div>
    </aside>
  )
}
