'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Menu, Package, Receipt, ShoppingCart, Tag, Wallet } from 'lucide-react'
import type { RolUsuario } from '@/types/database'
import { cn } from '@/components/ui/cn'

interface BottomNavProps {
  rol: RolUsuario
  onMenuClick: () => void
}

type NavSlot =
  | { type: 'link'; href: string; label: string; icon: typeof Home; match: string }
  | { type: 'center' }
  | { type: 'menu' }

export function BottomNav({ rol, onMenuClick }: BottomNavProps) {
  const pathname = usePathname()

  if (pathname === '/pos' || pathname.startsWith('/pos/')) return null

  const esCajero = rol === 'vendedor'

  const slots: NavSlot[] = esCajero
    ? [
        { type: 'link', href: '/caja', label: 'Caja', icon: Wallet, match: '/caja' },
        { type: 'link', href: '/ventas', label: 'Ventas', icon: Receipt, match: '/ventas' },
        { type: 'center' },
        { type: 'link', href: '/precios', label: 'Precios', icon: Tag, match: '/precios' },
        { type: 'menu' },
      ]
    : [
        { type: 'link', href: '/dashboard', label: 'Inicio', icon: Home, match: '/dashboard' },
        { type: 'link', href: '/ventas', label: 'Ventas', icon: Receipt, match: '/ventas' },
        { type: 'center' },
        { type: 'link', href: '/productos', label: 'Productos', icon: Package, match: '/productos' },
        { type: 'menu' },
      ]

  return (
    <nav
      className={cn(
        'lg:hidden fixed bottom-0 inset-x-0 z-(--z-nav) print:hidden',
        'bg-surface/95 backdrop-blur-sm border-t border-border-default',
        'pb-[env(safe-area-inset-bottom)]'
      )}
      aria-label="Navegación móvil"
    >
      <ul className="grid grid-cols-5 h-16 items-stretch">
        {slots.map((slot, i) => {
          if (slot.type === 'center') {
            return (
              <li key="vender" className="relative flex items-center justify-center">
                <Link
                  href="/pos"
                  aria-label="Vender"
                  className={cn(
                    'absolute -top-5 flex items-center justify-center',
                    'h-14 w-14 rounded-full bg-primary text-primary-fg shadow-md',
                    'hover:bg-primary-hover active:bg-primary-active transition-colors focus-ring'
                  )}
                >
                  <ShoppingCart size={22} aria-hidden />
                </Link>
              </li>
            )
          }

          if (slot.type === 'menu') {
            return (
              <li key="menu" className="flex">
                <button
                  type="button"
                  onClick={onMenuClick}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 text-fg-muted hover:text-fg cursor-pointer focus-ring"
                >
                  <Menu size={20} aria-hidden />
                  <span className="text-xs font-medium leading-none">Menú</span>
                </button>
              </li>
            )
          }

          const active =
            pathname === slot.match || pathname.startsWith(slot.match + '/')
          const Icon = slot.icon
          return (
            <li key={slot.href + i} className="flex">
              <Link
                href={slot.href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 focus-ring',
                  active ? 'text-fg-brand' : 'text-fg-muted hover:text-fg'
                )}
              >
                <Icon size={20} aria-hidden />
                <span className="text-xs font-medium leading-none">{slot.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
