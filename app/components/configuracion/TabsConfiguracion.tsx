import Link from 'next/link'

const tabs = [
  { href: '/configuracion',          label: 'Mi negocio', key: 'negocio'   as const },
  { href: '/configuracion/ticket',   label: 'Ticket',     key: 'ticket'    as const },
  { href: '/configuracion/cobros',   label: 'Cobros',     key: 'cobros'    as const },
  { href: '/configuracion/equipo',   label: 'Equipo',     key: 'equipo'    as const },
  { href: '/configuracion/avanzado', label: 'Avanzado',   key: 'avanzado'  as const },
]

export type ActiveTab = 'negocio' | 'ticket' | 'cobros' | 'equipo' | 'avanzado'

interface TabsConfiguracionProps {
  active: ActiveTab
}

export function TabsConfiguracion({ active }: TabsConfiguracionProps) {
  return (
    <nav className="border-b border-gray-200 mb-6">
      <ul className="flex flex-wrap gap-x-4 gap-y-0">
        {tabs.map((t) => {
          const isActive = t.key === active
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`inline-block py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-lime-600 text-lime-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                {t.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
