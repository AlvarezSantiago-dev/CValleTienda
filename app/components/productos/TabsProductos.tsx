'use client'

import { Suspense } from 'react'
import { useRubro } from '@/components/layout/RubroProvider'
import { Tabs, type TabItem } from '@/components/ui/Tabs'

interface TabsProductosProps {
  /** Conservado por compatibilidad — la ruta activa se deriva del pathname */
  active?: 'productos' | 'categorias' | 'tallas' | 'colores' | 'importar'
}

function TabsProductosInner() {
  const { labelVar1, labelVar2, usarVar1, usarVar2 } = useRubro()

  const items: TabItem[] = [
    { href: '/productos', label: 'Productos', exact: true },
    { href: '/productos/categorias', label: 'Categorías', exact: true },
    ...(usarVar1
      ? [{ href: '/productos/tallas', label: `${labelVar1}s`, exact: true } satisfies TabItem]
      : []),
    ...(usarVar2
      ? [{ href: '/productos/colores', label: `${labelVar2}s`, exact: true } satisfies TabItem]
      : []),
    { href: '/productos/importar', label: 'Importar CSV', exact: true },
  ]

  return <Tabs items={items} variant="underline" className="mb-6" />
}

export function TabsProductos(_props: TabsProductosProps) {
  return (
    <Suspense fallback={<div className="h-10 mb-6 border-b border-border-subtle" />}>
      <TabsProductosInner />
    </Suspense>
  )
}
