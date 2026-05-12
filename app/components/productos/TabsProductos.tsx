'use client'

import Link from 'next/link'
import { useRubro } from '@/components/layout/RubroProvider'

interface TabsProductosProps {
  active: 'productos' | 'categorias' | 'tallas' | 'colores'
}

export function TabsProductos({ active }: TabsProductosProps) {
  const { labelVar1, labelVar2, usarVar1, usarVar2 } = useRubro()

  const tabs = [
    { href: '/productos', label: 'Productos', key: 'productos', show: true },
    { href: '/productos/categorias', label: 'Categorías', key: 'categorias', show: true },
    { href: '/productos/tallas', label: `${labelVar1}s`, key: 'tallas', show: usarVar1 },
    { href: '/productos/colores', label: `${labelVar2}s`, key: 'colores', show: usarVar2 },
  ].filter((t) => t.show)

  return (
    <nav className="border-b border-gray-100 mb-6">
      <div className="overflow-x-auto">
        <ul className="flex gap-6 min-w-max">
          {tabs.map((t) => {
            const isActive = t.key === active
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={`inline-block py-3 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-lime-600 text-lime-700'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200'
                  }`}
                >
                  {t.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
