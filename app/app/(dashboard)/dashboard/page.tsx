import { Suspense } from 'react'
import { Banknote, Crosshair, Receipt, TrendingUp } from 'lucide-react'
import { obtenerSesionAbiertaLite } from '@/lib/caja/queries'
import {
  obtenerDashboardGanancia,
  obtenerDashboardInicio,
  obtenerSaldosCuentas,
} from '@/lib/dashboard/queries'
import { PorCobrarCard } from '@/components/dashboard/PorCobrarCard'
import { obtenerSesionesHoy } from '@/lib/dashboard/queries-sesion-dia'
import { formatARS } from '@/lib/format'
import { EstadoCajaBanner } from '@/components/dashboard/EstadoCajaBanner'
import { TurnosHoyCard } from '@/components/dashboard/TurnosHoyCard'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { VentasChartSection } from '@/components/dashboard/VentasChartSection'
import { StockBajoCard } from '@/components/dashboard/StockBajoCard'
import { SaldosCard } from '@/components/dashboard/SaldosCard'
import { GananciaBrutaCard } from '@/components/dashboard/GananciaBrutaCard'
import { DashboardSecundario } from '@/components/dashboard/DashboardSecundario'
import { DashboardSecundarioSkeleton } from '@/components/dashboard/DashboardSecundarioSkeleton'
import { PageHeader } from '@/components/ui/PageHeader'
import { LinkButton } from '@/components/ui/Button'
import { getContextoTienda } from '@/lib/supabase/context'
import { getConfigRubro } from '@/lib/rubro/config'
import type { Rubro } from '@/types/database'
import { formatHoyLegible } from '@/lib/datetime'

export default async function DashboardPage() {
  const ctx = await getContextoTienda()
  const config = getConfigRubro((ctx?.rubro ?? 'generico') as Rubro)

  const trialVencido =
    ctx !== null &&
    ctx.plan === 'basico' &&
    ctx.trial_hasta !== null &&
    new Date(ctx.trial_hasta) < new Date()

  const [sesion, cuentas, inicio, gananciaAlDia, sesionesHoy] = await Promise.all([
    obtenerSesionAbiertaLite(),
    obtenerSaldosCuentas(),
    obtenerDashboardInicio(),
    obtenerDashboardGanancia(),
    obtenerSesionesHoy(),
  ])

  const { kpisDia, kpisMes, serie: serie14d, porCobrar, stockBajo } = inicio
  const hoy = formatHoyLegible({ weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      <PageHeader title="Inicio" description={hoy} />

      {trialVencido && (
        <div className="rounded-[var(--radius-lg)] bg-warning-soft border border-warning-border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-warning-soft-fg">
              Tu período de prueba gratuita venció
            </p>
            <p className="text-xs text-warning-soft-fg/90 mt-0.5">
              Ahora estás en el plan Básico. Remitos, Devoluciones y CRM completo requieren plan Pro.
            </p>
          </div>
          <LinkButton href="/planes" size="sm" variant="outline" className="shrink-0 border-warning-border text-warning-soft-fg hover:bg-warning-soft">
            Ver planes
          </LinkButton>
        </div>
      )}

      <EstadoCajaBanner sesion={sesion} kpisDia={kpisDia} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ventas de hoy (neto)"
          valor={formatARS(kpisDia.netoHoy)}
          delta={kpisDia.deltaMontoPct}
          sub="vs ayer · calendario, todos los turnos"
          destacar
          icono={<Banknote size={16} aria-hidden />}
        />
        <KpiCard
          label="Cant. ventas hoy"
          valor={String(kpisDia.hoy.cantidad)}
          delta={kpisDia.deltaCantidadPct}
          sub="vs ayer · día calendario"
          icono={<Receipt size={16} aria-hidden />}
        />
        <KpiCard
          label="Ticket promedio hoy"
          valor={formatARS(kpisDia.ticketPromedioHoy)}
          sub={
            kpisDia.hoy.cantidad > 0
              ? `sobre ${kpisDia.hoy.cantidad} ${kpisDia.hoy.cantidad === 1 ? 'venta' : 'ventas'} del día`
              : 'sin ventas todavía'
          }
          icono={<Crosshair size={16} aria-hidden />}
        />
        <KpiCard
          label="Ventas del mes"
          valor={formatARS(kpisMes.netoMes)}
          delta={kpisMes.deltaMontoPct}
          sub="vs mes pasado"
          icono={<TrendingUp size={16} aria-hidden />}
        />
        {config.usarPedidoCc && (
          <PorCobrarCard total={porCobrar.total} clientes={porCobrar.clientes} />
        )}
      </div>

      <GananciaBrutaCard data={gananciaAlDia} />

      <TurnosHoyCard sesiones={sesionesHoy} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <VentasChartSection serie={serie14d} />
        <StockBajoCard cantidad={stockBajo} />
      </div>

      <Suspense fallback={<DashboardSecundarioSkeleton />}>
        <DashboardSecundario usarVar1={config.usarVar1} labelVar1={config.labelVar1} />
      </Suspense>

      <SaldosCard cuentas={cuentas} />

    </div>
  )
}
