import {
  obtenerDashboardTops,
  obtenerTopClientesHistorico,
  obtenerUltimasDevoluciones,
  obtenerUltimasVentas,
} from '@/lib/dashboard/queries'
import { TopProductosCard } from './TopProductosCard'
import { TopClientesCard } from './TopClientesCard'
import { TopVar1Card } from './TopVar1Card'
import { UltimasVentasCard } from './UltimasVentasCard'
import { UltimasDevolucionesCard } from './UltimasDevolucionesCard'

interface Props {
  usarVar1: boolean
  labelVar1: string
}

export async function DashboardSecundario({ usarVar1, labelVar1 }: Props) {
  const [tops, topClientes, ultimasVentas, ultimasDevoluciones] = await Promise.all([
    obtenerDashboardTops(5),
    obtenerTopClientesHistorico(5),
    obtenerUltimasVentas(5),
    obtenerUltimasDevoluciones(5),
  ])

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopProductosCard items={tops.productos} />
        {usarVar1 && tops.var1.length > 0 ? (
          <TopVar1Card items={tops.var1} labelVar1={labelVar1} />
        ) : (
          <TopClientesCard items={topClientes} />
        )}
      </div>

      {usarVar1 && tops.var1.length > 0 && (
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
    </>
  )
}
