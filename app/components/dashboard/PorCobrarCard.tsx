import { Wallet } from 'lucide-react'
import { KpiCard } from './KpiCard'
import { formatARS } from '@/lib/format'

interface PorCobrarCardProps {
  total: number
  clientes: number
}

export function PorCobrarCard({ total, clientes }: PorCobrarCardProps) {
  return (
    <KpiCard
      label="Por cobrar"
      valor={formatARS(total)}
      sub={
        clientes === 0
          ? 'sin clientes con deuda'
          : `${clientes} ${clientes === 1 ? 'cliente' : 'clientes'} con saldo`
      }
      href="/clientes?deuda=1"
      icono={<Wallet size={16} aria-hidden />}
    />
  )
}
