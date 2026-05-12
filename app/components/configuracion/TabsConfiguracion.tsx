import Link from 'next/link'

const tabs = [
  { href: '/configuracion', label: 'Tienda y ticket', key: 'tienda' as const },
  { href: '/configuracion/rubro', label: 'Rubro', key: 'rubro' as const },
  { href: '/configuracion/metodos-pago', label: 'Métodos de pago', key: 'metodos-pago' as const },
  { href: '/configuracion/cuentas-fondos', label: 'Cuentas de fondos', key: 'cuentas-fondos' as const },
  { href: '/configuracion/etiquetas', label: 'Etiquetas', key: 'etiquetas' as const },
  { href: '/configuracion/importar', label: 'Importar', key: 'importar' as const },
  { href: '/configuracion/facturacion', label: 'Facturación AFIP', key: 'facturacion' as const },
]

interface TabsConfiguracionProps {
  active: 'tienda' | 'rubro' | 'metodos-pago' | 'cuentas-fondos' | 'etiquetas' | 'importar' | 'facturacion'
}

export function TabsConfiguracion({ active }: TabsConfiguracionProps) {
  return (
    <nav className="border-b border-gray-200 mb-6 overflow-x-auto">
      <ul className="flex gap-4 min-w-max">
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
