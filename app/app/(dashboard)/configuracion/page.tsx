import { ConfiguracionShell } from '@/components/configuracion/ConfiguracionShell'
import { NegocioForm } from '@/components/configuracion/NegocioForm'
import { obtenerConfiguracionTienda, obtenerRubroTienda } from '@/lib/configuracion/queries'
import type { Rubro } from '@/lib/rubro/config'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionPage() {
  let config = null
  let rubro: Rubro = 'generico'
  try {
    const [cfg, rubroRaw] = await Promise.all([
      obtenerConfiguracionTienda(),
      obtenerRubroTienda(),
    ])
    config = cfg
    rubro = rubroRaw as Rubro
  } catch (err) {
    console.error('[configuracion] carga', err)
  }

  return (
    <ConfiguracionShell
      title="Mi negocio"
      description="Identidad, datos fiscales y configuración de rentabilidad."
    >
      <NegocioForm initial={config} rubroActual={rubro} />
    </ConfiguracionShell>
  )
}
