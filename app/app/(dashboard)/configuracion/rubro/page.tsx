import { TabsConfiguracion } from '@/components/configuracion/TabsConfiguracion'
import { RubroForm } from '@/components/configuracion/RubroForm'
import { obtenerRubroTienda } from '@/lib/configuracion/queries'
import type { Rubro } from '@/lib/rubro/config'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionRubroPage() {
  const rubro = await obtenerRubroTienda()

  return (
    <div>
      <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">Rubro del negocio</h1>
      <p className="text-[13px] text-gray-400 mb-5">
        Tipo de negocio: define los labels de variantes y las unidades de medida disponibles.
      </p>

      <TabsConfiguracion active="rubro" />

      <RubroForm rubroActual={rubro as Rubro} />
    </div>
  )
}
