import { ConfiguracionShell } from '@/components/configuracion/ConfiguracionShell'
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
    <ConfiguracionShell
      title="Ticket de venta"
      description="Todo lo que se imprime en el ticket. Nada más."
    >
      <TicketForm initial={config} rubro={rubro} />
    </ConfiguracionShell>
  )
}
