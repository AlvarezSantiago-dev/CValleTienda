'use client'

import { Suspense } from 'react'
import { Tabs, type TabItem } from '@/components/ui/Tabs'

const tabs: TabItem[] = [
  { href: '/configuracion', label: 'Mi negocio', exact: true },
  { href: '/configuracion/ticket', label: 'Ticket', exact: true },
  { href: '/configuracion/cobros', label: 'Cobros', exact: true },
  { href: '/configuracion/equipo', label: 'Equipo', exact: true },
  { href: '/configuracion/avanzado', label: 'Avanzado' },
]

export type ActiveTab = 'negocio' | 'ticket' | 'cobros' | 'equipo' | 'avanzado'

interface TabsConfiguracionProps {
  /** Conservado por compatibilidad — la ruta activa se deriva del pathname */
  active?: ActiveTab
}

function TabsInner() {
  return <Tabs items={tabs} variant="underline" className="mb-6" />
}

export function TabsConfiguracion(_props: TabsConfiguracionProps) {
  return (
    <Suspense fallback={<div className="h-10 mb-6 border-b border-border-default" />}>
      <TabsInner />
    </Suspense>
  )
}
