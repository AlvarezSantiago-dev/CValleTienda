import { ConfiguracionShell } from '@/components/configuracion/ConfiguracionShell'
import { NegocioForm } from '@/components/configuracion/NegocioForm'
import { obtenerConfiguracionTienda, obtenerRubroTienda } from '@/lib/configuracion/queries'
import type { Rubro } from '@/lib/rubro/config'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionPage() {
  const [config, rubroRaw] = await Promise.all([
    obtenerConfiguracionTienda(),
    obtenerRubroTienda(),
  ])
  const rubro = rubroRaw as Rubro

  return (
    <ConfiguracionShell
      title="Mi negocio"
      description="Identidad, datos fiscales y configuración de rentabilidad."
    >
      <NegocioForm initial={config} rubroActual={rubro} />
    </ConfiguracionShell>
  )
}
