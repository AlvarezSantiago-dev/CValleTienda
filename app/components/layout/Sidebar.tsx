'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Perfil, RolUsuario } from '@/types/database'
import { logoutAction } from '@/app/actions/auth'
import { usePlan } from '@/components/layout/PlanProvider'
import { useRubro } from '@/components/layout/RubroProvider'
import {
  IconHome, IconPOS, IconVentas, IconReturn, IconTruck,
  IconProductos, IconStock, IconCaja, IconClientes, IconConfig, IconPlanes, IconReportes, IconGraficos,
  IconPrecios,
} from './SidebarIcons'

interface SidebarProps {
  perfil: Perfil
  tiendaNombre: string
  onClose?: () => void
}

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  showWhen?: 'always' | 'remitos' | 'devoluciones'
  /** Si se define, solo se muestra para esos roles. Undefined = todos. */
  soloRoles?: RolUsuario[]
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const ROLES_ADMIN: RolUsuario[] = ['owner', 'admin']

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Ventas',
    items: [
      { href: '/dashboard',    label: 'Inicio',           icon: <IconHome />,    showWhen: 'always',       soloRoles: ROLES_ADMIN },
      { href: '/pos',          label: 'Vender (POS)',     icon: <IconPOS />,     showWhen: 'always' },
      { href: '/ventas',       label: 'Ventas',           icon: <IconVentas />,  showWhen: 'always' },
      { href: '/precios',      label: 'Lista de precios', icon: <IconPrecios />, showWhen: 'always' },
      { href: '/devoluciones', label: 'Devoluciones',     icon: <IconReturn />,  showWhen: 'devoluciones', soloRoles: ROLES_ADMIN },
      { href: '/remitos',      label: 'Remitos',          icon: <IconTruck />,   showWhen: 'remitos',      soloRoles: ROLES_ADMIN },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { href: '/productos', label: 'Productos', icon: <IconProductos />, showWhen: 'always', soloRoles: ROLES_ADMIN },
      { href: '/stock',     label: 'Stock',     icon: <IconStock />,     showWhen: 'always', soloRoles: ROLES_ADMIN },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { href: '/caja',      label: 'Caja',      icon: <IconCaja />,      showWhen: 'always' },
      { href: '/clientes',  label: 'Clientes',  icon: <IconClientes />,  showWhen: 'always', soloRoles: ROLES_ADMIN },
      { href: '/reportes',  label: 'Reportes',  icon: <IconReportes />,  showWhen: 'always', soloRoles: ROLES_ADMIN },
      { href: '/graficos',  label: 'Gráficos',  icon: <IconGraficos />,  showWhen: 'always', soloRoles: ROLES_ADMIN },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/configuracion', label: 'Configuración', icon: <IconConfig />, showWhen: 'always', soloRoles: ROLES_ADMIN },
      { href: '/planes',        label: 'Planes',        icon: <IconPlanes />, showWhen: 'always', soloRoles: ROLES_ADMIN },
    ],
  },
]

export default function Sidebar({ perfil, tiendaNombre, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { planEfectivo, esTrial, diasTrial } = usePlan()
  const { usarRemitos, usarDevoluciones } = useRubro()
  const esCajero = perfil.rol === 'vendedor'

  const navGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.showWhen === 'remitos') {
        if (!usarRemitos) return false
      }
      if (item.showWhen === 'devoluciones') {
        if (!usarDevoluciones) return false
      }
      if (item.soloRoles && !item.soloRoles.includes(perfil.rol as RolUsuario)) return false
      return true
    }),
  })).filter((group) => group.items.length > 0)

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
        {/* Badge de plan — solo para admin/owner */}
        {!esCajero && (
          <Link
            href="/planes"
            onClick={onClose}
            className={`ml-auto flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-opacity hover:opacity-75 ${
              esTrial
                ? 'bg-amber-100 text-amber-700'
                : planEfectivo === 'pro'
                ? 'bg-lime-100 text-lime-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            {esTrial ? `TRIAL ${diasTrial}d` : planEfectivo === 'pro' ? 'PRO' : 'BÁSICO'}
          </Link>
        )}
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
                    className={`group flex items-center gap-2.5 pl-2.5 pr-3 py-1.5 rounded-lg text-[13px] transition-all border-l-2 ${
                      isActive
                        ? 'border-lime-500 bg-lime-50 text-lime-800 font-semibold'
                        : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                  >
                    <span className={`flex-shrink-0 transition-transform duration-150 group-hover:scale-110 ${
                      isActive ? 'text-lime-600' : 'text-gray-400 group-hover:text-gray-600'
                    }`}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Usuario + Logout */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1">
          <div className="w-7 h-7 rounded-lg bg-lime-50 flex items-center justify-center text-lime-700 font-bold text-xs flex-shrink-0">
            {perfil.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-gray-900 truncate leading-tight">
              {perfil.nombre}
            </p>
            <p className="text-[10px] text-gray-400 capitalize leading-tight">
              {perfil.rol === 'vendedor' ? 'Cajero' : perfil.rol}
            </p>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg text-[12px] text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  )
}
