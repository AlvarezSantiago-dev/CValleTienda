import { Banknote, Crosshair, Receipt, TrendingUp } from 'lucide-react'
import { obtenerSesionAbiertaLite } from '@/lib/caja/queries'
import {
  obtenerKpisDia,
  obtenerKpisMes,
  obtenerSerieVentas14Dias,
  obtenerTopProductosMes,
  obtenerTopClientesHistorico,
  obtenerStockBajoCount,
  obtenerUltimasVentas,
  obtenerUltimasDevoluciones,
  obtenerSaldosCuentas,
  obtenerTopVar1Mes,
  obtenerGananciaBrutaMes,
} from '@/lib/dashboard/queries'
import { obtenerSesionesHoy } from '@/lib/dashboard/queries-sesion-dia'
import { formatARS } from '@/lib/format'
import { EstadoCajaBanner } from '@/components/dashboard/EstadoCajaBanner'
import { TurnosHoyCard } from '@/components/dashboard/TurnosHoyCard'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { VentasChartSection } from '@/components/dashboard/VentasChartSection'
import { StockBajoCard } from '@/components/dashboard/StockBajoCard'
import { TopProductosCard } from '@/components/dashboard/TopProductosCard'
import { TopClientesCard } from '@/components/dashboard/TopClientesCard'
import { TopVar1Card } from '@/components/dashboard/TopVar1Card'
import { UltimasVentasCard } from '@/components/dashboard/UltimasVentasCard'
import { UltimasDevolucionesCard } from '@/components/dashboard/UltimasDevolucionesCard'
import { SaldosCard } from '@/components/dashboard/SaldosCard'
import { GananciaBrutaCard } from '@/components/dashboard/GananciaBrutaCard'
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

  const [
    sesion,
    cuentas,
    kpisDia,
    kpisMes,
    serie14d,
    topProductos,
    topClientes,
    stockBajo,
    ultimasVentas,
    ultimasDevoluciones,
    topVar1,
    gananciaBruta,
    sesionesHoy,
  ] = await Promise.all([
    obtenerSesionAbiertaLite(),
    obtenerSaldosCuentas(),
    obtenerKpisDia(),
    obtenerKpisMes(),
    obtenerSerieVentas14Dias(),
    obtenerTopProductosMes(5),
    obtenerTopClientesHistorico(5),
    obtenerStockBajoCount(),
    obtenerUltimasVentas(5),
    obtenerUltimasDevoluciones(5),
    obtenerTopVar1Mes(5),
    obtenerGananciaBrutaMes(),
    obtenerSesionesHoy(),
  ])

  const hoy = formatHoyLegible({ weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-6">
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
      </div>

      <TurnosHoyCard sesiones={sesionesHoy} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <VentasChartSection serie={serie14d} />
        <StockBajoCard cantidad={stockBajo} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopProductosCard items={topProductos} />
        {config.usarVar1 && topVar1.length > 0 ? (
          <TopVar1Card items={topVar1} labelVar1={config.labelVar1} />
        ) : (
          <TopClientesCard items={topClientes} />
        )}
      </div>

      {config.usarVar1 && topVar1.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TopClientesCard items={topClientes} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UltimasVentasCard
          items={ultimasVentas.ventas}
          prefijoTicket={ultimasVentas.prefijo_ticket}
          titulo="Últimas ventas de hoy"
        />
        <UltimasDevolucionesCard items={ultimasDevoluciones} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GananciaBrutaCard data={gananciaBruta} />
        <SaldosCard cuentas={cuentas} />
      </div>
    </div>
  )
}
