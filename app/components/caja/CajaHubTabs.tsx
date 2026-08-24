import { Tabs, type TabItem } from '@/components/ui/Tabs'

interface Props {
  esCajero: boolean
  mesStr: string
  tab: 'turno' | 'cuentas' | 'historial'
}

export function CajaHubTabs({ esCajero, mesStr, tab: _tab }: Props) {
  const items: TabItem[] = [
    { href: '/caja?tab=turno', label: 'Turno', exact: true, matchKeys: ['tab'] },
  ]
  if (!esCajero) {
    items.push(
      { href: '/caja?tab=cuentas', label: 'Cuentas', exact: true, matchKeys: ['tab'] },
      {
        href: `/caja?tab=historial&mes=${mesStr}`,
        label: 'Historial',
        exact: true,
        matchKeys: ['tab'],
      }
    )
  }

  return <Tabs items={items} variant="underline" className="mb-4" />
}
