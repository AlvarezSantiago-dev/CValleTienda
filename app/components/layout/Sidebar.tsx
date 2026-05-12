'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Perfil } from '@/types/database'
import { logoutAction } from '@/app/actions/auth'
import { usePlan } from '@/components/layout/PlanProvider'
import {
  IconHome, IconPOS, IconVentas, IconReturn, IconTruck,
  IconProductos, IconStock, IconCaja, IconClientes, IconConfig,
} from './SidebarIcons'

interface SidebarProps {
  perfil: Perfil
  tiendaNombre: string
  onClose?: () => void
}

const navGroups = [
  {
    label: 'Ventas',
    items: [
      { href: '/dashboard',    label: 'Inicio',        icon: <IconHome /> },
      { href: '/pos',          label: 'Vender (POS)',  icon: <IconPOS /> },
      { href: '/ventas',       label: 'Ventas',        icon: <IconVentas /> },
      { href: '/devoluciones', label: 'Devoluciones',  icon: <IconReturn /> },
      { href: '/remitos',      label: 'Remitos',       icon: <IconTruck /> },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { href: '/productos', label: 'Productos', icon: <IconProductos /> },
      { href: '/stock',     label: 'Stock',     icon: <IconStock /> },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/caja',     label: 'Caja',     icon: <IconCaja /> },
      { href: '/clientes', label: 'Clientes', icon: <IconClientes /> },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/configuracion', label: 'Configuración', icon: <IconConfig /> },
    ],
  },
]

export default function Sidebar({ perfil, tiendaNombre, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { planEfectivo, esTrial, diasTrial } = usePlan()

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0 shadow-xl lg:shadow-none">
      {/* Logo / Tienda */}
      <div className="px-4 py-5 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#0A0A0A] rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white text-[13px] font-bold tracking-tight">C</span>
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#0A0A0A] truncate leading-tight">
            {tiendaNombre}
          </p>
          <p className="text-[10px] text-gray-400 leading-tight">CValleTienda</p>
        </div>
        {/* Badge de plan */}
        <span className={`ml-auto flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
          esTrial
            ? 'bg-amber-100 text-amber-700'
            : planEfectivo === 'pro'
            ? 'bg-lime-100 text-lime-700'
            : 'bg-gray-100 text-gray-500'
        }`}>
          {esTrial ? `TRIAL ${diasTrial}d` : planEfectivo === 'pro' ? 'PRO' : 'BÁSICO'}
        </span>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.10em] text-gray-400 px-3 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-2.5 pl-2.5 pr-3 py-2 rounded-lg text-[13px] transition-colors border-l-2 ${
                      isActive
                        ? 'border-lime-500 bg-lime-50 text-lime-800 font-semibold'
                        : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Usuario + Logout */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-lime-50 flex items-center justify-center text-lime-700 font-bold text-[13px] flex-shrink-0">
            {perfil.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[#0A0A0A] truncate leading-tight">
              {perfil.nombre}
            </p>
            <p className="text-[11px] text-gray-400 capitalize leading-tight">{perfil.rol}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full text-left pl-2 text-[12px] text-gray-400 hover:text-gray-700 transition-colors"
          >
            Salir →
          </button>
        </form>
      </div>
    </aside>
  )
}
