import { TabsConfiguracion } from '@/components/configuracion/TabsConfiguracion'
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
    <div>
      <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">Mi negocio</h1>
      <p className="text-[13px] text-gray-400 mb-5">
        Identidad, datos fiscales y configuración de rentabilidad.
      </p>

      <TabsConfiguracion active="negocio" />

      <div className="max-w-3xl mt-6">
        <NegocioForm initial={config} rubroActual={rubro} />
      </div>
    </div>
  )
}

