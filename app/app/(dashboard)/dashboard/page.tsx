import Link from 'next/link'
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
import { VentasChart } from '@/components/dashboard/VentasChart'
import { StockBajoCard } from '@/components/dashboard/StockBajoCard'
import { TopProductosCard } from '@/components/dashboard/TopProductosCard'
import { TopClientesCard } from '@/components/dashboard/TopClientesCard'
import { TopVar1Card } from '@/components/dashboard/TopVar1Card'
import { UltimasVentasCard } from '@/components/dashboard/UltimasVentasCard'
import { UltimasDevolucionesCard } from '@/components/dashboard/UltimasDevolucionesCard'
import { SaldosCard } from '@/components/dashboard/SaldosCard'
import { GananciaBrutaCard } from '@/components/dashboard/GananciaBrutaCard'
import {
  IconDollar,
  IconReceipt,
  IconTarget,
  IconTrendUp,
} from '@/components/dashboard/DashboardIcons'
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
      <div>
        <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Inicio</h1>
        <p className="text-[13px] text-gray-400 capitalize">{hoy}</p>
      </div>

      {trialVencido && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-amber-800">Tu período de prueba gratuita venció</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Ahora estás en el plan Básico. Remitos, Devoluciones y CRM completo requieren plan Pro.
            </p>
          </div>
          <Link
            href="/planes"
            className="shrink-0 h-8 px-4 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold rounded-full transition-colors whitespace-nowrap"
          >
            Ver planes
          </Link>
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
          icono={<IconDollar />}
        />
        <KpiCard
          label="Cant. ventas hoy"
          valor={String(kpisDia.hoy.cantidad)}
          delta={kpisDia.deltaCantidadPct}
          sub="vs ayer · día calendario"
          icono={<IconReceipt />}
        />
        <KpiCard
          label="Ticket promedio hoy"
          valor={formatARS(kpisDia.ticketPromedioHoy)}
          sub={
            kpisDia.hoy.cantidad > 0
              ? `sobre ${kpisDia.hoy.cantidad} ${kpisDia.hoy.cantidad === 1 ? 'venta' : 'ventas'} del día`
              : 'sin ventas todavía'
          }
          icono={<IconTarget />}
        />
        <KpiCard
          label="Ventas del mes"
          valor={formatARS(kpisMes.netoMes)}
          delta={kpisMes.deltaMontoPct}
          sub="vs mes pasado"
          icono={<IconTrendUp />}
        />
      </div>

      <TurnosHoyCard sesiones={sesionesHoy} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-[14px] font-semibold text-gray-900">Ventas últimos 14 días</h2>
            <p className="text-xs text-gray-400 mt-0.5">Solo ventas completadas (bruto, sin descontar devoluciones).</p>
          </div>
          <div className="p-5">
            <VentasChart serie={serie14d} />
          </div>
        </div>
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
          <div />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UltimasVentasCard
          items={ultimasVentas.ventas}
          prefijoTicket={ultimasVentas.prefijo_ticket}
          titulo="Últimas ventas de hoy"
        />
        {ultimasDevoluciones.length > 0 ? (
          <UltimasDevolucionesCard items={ultimasDevoluciones} />
        ) : (
          <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="text-[14px] font-semibold text-gray-900">Últimas devoluciones</h2>
            </div>
            <p className="text-sm text-gray-400 py-8 text-center px-5">Sin devoluciones recientes.</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GananciaBrutaCard data={gananciaBruta} />
        <SaldosCard cuentas={cuentas} />
      </div>
    </div>
  )
}
