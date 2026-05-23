import { obtenerSesionAbierta } from '@/lib/caja/queries'
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
import { formatARS } from '@/lib/format'
import { EstadoCajaBanner } from '@/components/dashboard/EstadoCajaBanner'
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
import Link from 'next/link'

export default async function DashboardPage() {
  const ctx = await getContextoTienda()
  const config = getConfigRubro((ctx?.rubro ?? 'generico') as Rubro)

  // Trial vencido: plan=basico, trial_hasta existe pero ya pasó
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
  ] = await Promise.all([
    obtenerSesionAbierta(),
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
  ])

  const hoy = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Inicio</h1>
        <p className="text-[13px] text-gray-400 capitalize">{hoy}</p>
      </div>

      {/* Banner: trial vencido */}
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

      <EstadoCajaBanner sesion={sesion} />

      {/* Fila 1: KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Ventas hoy (neto)"
          valor={formatARS(kpisDia.netoHoy)}
          delta={kpisDia.deltaMontoPct}
          sub="vs ayer"
          destacar
          icono={<IconDollar />}
        />
        <KpiCard
          label="Cant. ventas hoy"
          valor={String(kpisDia.hoy.cantidad)}
          delta={kpisDia.deltaCantidadPct}
          sub="vs ayer"
          icono={<IconReceipt />}
        />
        <KpiCard
          label="Ticket promedio hoy"
          valor={formatARS(kpisDia.ticketPromedioHoy)}
          sub={
            kpisDia.hoy.cantidad > 0
              ? `sobre ${kpisDia.hoy.cantidad} ${kpisDia.hoy.cantidad === 1 ? 'venta' : 'ventas'}`
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

      {/* Fila 2: Chart + StockBajo */}
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

      {/* Fila 3: Top productos + Top variante por rubro */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopProductosCard items={topProductos} />
        {config.usarVar1 && topVar1.length > 0 ? (
          <TopVar1Card items={topVar1} labelVar1={config.labelVar1} />
        ) : (
          <TopClientesCard items={topClientes} />
        )}
      </div>

      {/* Fila 4: Top clientes (sólo si ya se mostró en lugar de var1) */}
      {config.usarVar1 && topVar1.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TopClientesCard items={topClientes} />
          <div />
        </div>
      )}

      {/* Fila 5: Últimas operaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <UltimasVentasCard items={ultimasVentas} />
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

      {/* Fila 6: Ganancia bruta + Saldos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GananciaBrutaCard data={gananciaBruta} />
        <SaldosCard cuentas={cuentas} />
      </div>
    </div>
  )
}
