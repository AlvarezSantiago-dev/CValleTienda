import { TabsConfiguracion } from '@/components/configuracion/TabsConfiguracion'
import { TicketForm } from '@/components/configuracion/TicketForm'
import { obtenerConfiguracionTienda, obtenerRubroTienda } from '@/lib/configuracion/queries'
import type { Rubro } from '@/lib/rubro/config'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionTicketPage() {
  const [config, rubroRaw] = await Promise.all([
    obtenerConfiguracionTienda(),
    obtenerRubroTienda(),
  ])
  const rubro = rubroRaw as Rubro

  return (
    <div>
      <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">Ticket de venta</h1>
      <p className="text-[13px] text-gray-400 mb-5">
        Todo lo que se imprime en el ticket. Nada más.
      </p>

      <TabsConfiguracion active="ticket" />

      <div className="max-w-3xl mt-6">
        <TicketForm initial={config} rubro={rubro} />
      </div>
    </div>
  )
}
