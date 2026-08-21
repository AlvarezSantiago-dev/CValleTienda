import type { LucideIcon } from 'lucide-react'
import type { RolUsuario } from '@/types/database'
import {
  LayoutDashboard,
  ShoppingCart,
  Receipt,
  Tag,
  Undo2,
  Truck,
  Package,
  Boxes,
  Wallet,
  Users,
  BarChart3,
  LineChart,
  Settings,
  CreditCard,
  ClipboardList,
} from 'lucide-react'

export type { LucideIcon }

export interface NavItemConfig {
  href: string
  label: string
  icon: LucideIcon
  showWhen?: 'always' | 'remitos' | 'devoluciones'
  soloRoles?: RolUsuario[]
  /** Atajos / keywords para command palette */
  keywords?: string[]
}

export interface NavGroupConfig {
  label: string
  items: NavItemConfig[]
}

export const ROLES_ADMIN: RolUsuario[] = ['owner', 'admin']

export const NAV_GROUPS: NavGroupConfig[] = [
  {
    label: 'Ventas',
    items: [
      {
        href: '/dashboard',
        label: 'Inicio',
        icon: LayoutDashboard,
        showWhen: 'always',
        soloRoles: ROLES_ADMIN,
        keywords: ['dashboard', 'home', 'inicio'],
      },
      {
        href: '/pos',
        label: 'Vender (POS)',
        icon: ShoppingCart,
        showWhen: 'always',
        keywords: ['pos', 'caja', 'vender', 'cobrar'],
      },
      {
        href: '/ventas',
        label: 'Ventas',
        icon: Receipt,
        showWhen: 'always',
        keywords: ['historial', 'tickets'],
      },
      {
        href: '/pedidos',
        label: 'Pedidos',
        icon: ClipboardList,
        showWhen: 'always',
        keywords: ['pedido', 'whatsapp', 'catalogo', 'catalogo publico'],
      },
      {
        href: '/precios',
        label: 'Lista de precios',
        icon: Tag,
        showWhen: 'always',
        keywords: ['precios', 'lista'],
      },
      {
        href: '/devoluciones',
        label: 'Devoluciones',
        icon: Undo2,
        showWhen: 'devoluciones',
        soloRoles: ROLES_ADMIN,
        keywords: ['devolver', 'cambio'],
      },
      {
        href: '/remitos',
        label: 'Remitos',
        icon: Truck,
        showWhen: 'remitos',
        soloRoles: ROLES_ADMIN,
        keywords: ['entrega', 'envio'],
      },
    ],
  },
  {
    label: 'Inventario',
    items: [
      {
        href: '/productos',
        label: 'Productos',
        icon: Package,
        showWhen: 'always',
        soloRoles: ROLES_ADMIN,
        keywords: ['catalogo', 'articulo'],
      },
      {
        href: '/stock',
        label: 'Stock',
        icon: Boxes,
        showWhen: 'always',
        soloRoles: ROLES_ADMIN,
        keywords: ['inventario', 'existencia'],
      },
    ],
  },
  {
    label: 'Gestión',
    items: [
      {
        href: '/caja',
        label: 'Caja',
        icon: Wallet,
        showWhen: 'always',
        keywords: ['turno', 'apertura', 'cierre'],
      },
      {
        href: '/clientes',
        label: 'Clientes',
        icon: Users,
        showWhen: 'always',
        soloRoles: ROLES_ADMIN,
        keywords: ['crm', 'cuenta corriente'],
      },
      {
        href: '/reportes',
        label: 'Reportes',
        icon: BarChart3,
        showWhen: 'always',
        soloRoles: ROLES_ADMIN,
        keywords: ['finanzas', 'pl'],
      },
      {
        href: '/graficos',
        label: 'Gráficos',
        icon: LineChart,
        showWhen: 'always',
        soloRoles: ROLES_ADMIN,
        keywords: ['charts', 'kpi'],
      },
    ],
  },
  {
    label: 'Sistema',
    items: [
      {
        href: '/configuracion',
        label: 'Configuración',
        icon: Settings,
        showWhen: 'always',
        soloRoles: ROLES_ADMIN,
        keywords: ['ajustes', 'settings'],
      },
      {
        href: '/planes',
        label: 'Planes',
        icon: CreditCard,
        showWhen: 'always',
        soloRoles: ROLES_ADMIN,
        keywords: ['billing', 'suscripcion', 'pro'],
      },
    ],
  },
]

export function filterNavGroups(
  groups: NavGroupConfig[],
  opts: {
    rol: RolUsuario
    usarRemitos: boolean
    usarDevoluciones: boolean
    usarPedidoCc?: boolean
  }
): NavGroupConfig[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => {
          if (item.showWhen === 'remitos' && !opts.usarRemitos) return false
          if (item.showWhen === 'devoluciones' && !opts.usarDevoluciones) return false
          if (item.soloRoles && !item.soloRoles.includes(opts.rol)) return false
          return true
        })
        .map((item) =>
          opts.usarPedidoCc && item.href === '/pos'
            ? { ...item, label: 'Pedido', keywords: [...(item.keywords ?? []), 'pedido'] }
            : item
        ),
    }))
    .filter((group) => group.items.length > 0)
}

export function flattenNavItems(groups: NavGroupConfig[]): NavItemConfig[] {
  return groups.flatMap((g) => g.items)
}

/** Labels legibles para breadcrumbs por segmento de ruta */
export const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Inicio',
  pos: 'Vender',
  ventas: 'Ventas',
  pedidos: 'Pedidos',
  precios: 'Lista de precios',
  devoluciones: 'Devoluciones',
  remitos: 'Remitos',
  productos: 'Productos',
  categorias: 'Categorías',
  tallas: 'Tallas',
  colores: 'Colores',
  importar: 'Importar',
  nuevo: 'Nuevo',
  stock: 'Stock',
  movimientos: 'Movimientos',
  caja: 'Caja',
  sesiones: 'Sesiones',
  clientes: 'Clientes',
  editar: 'Editar',
  reportes: 'Reportes',
  graficos: 'Gráficos',
  configuracion: 'Configuración',
  catalogo: 'Catálogo',
  ticket: 'Ticket',
  cobros: 'Cobros',
  equipo: 'Equipo',
  avanzado: 'Avanzado',
  etiquetas: 'Etiquetas',
  facturacion: 'Facturación',
  'metodos-pago': 'Métodos de pago',
  'cuentas-fondos': 'Cuentas de fondos',
  rubro: 'Rubro',
  planes: 'Planes',
  onboarding: 'Onboarding',
  design: 'Design System',
}
