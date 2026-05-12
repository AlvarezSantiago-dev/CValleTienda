import { TabsConfiguracion } from '@/components/configuracion/TabsConfiguracion'
import { DatosTiendaForm } from '@/components/configuracion/DatosTiendaForm'
import { LogoUpload } from '@/components/configuracion/LogoUpload'
import { obtenerConfiguracionTienda } from '@/lib/configuracion/queries'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionPage() {
  const config = await obtenerConfiguracionTienda()

  return (
    <div>
      <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">Configuración</h1>
      <p className="text-[13px] text-gray-400 mb-5">
        Datos fiscales de tu tienda y personalización del ticket impreso.
      </p>

      <TabsConfiguracion active="tienda" />

      <div className="max-w-3xl space-y-8 mt-6">
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <LogoUpload logoUrl={config?.logo_url ?? null} />
        </div>
        <DatosTiendaForm initial={config} />
      </div>
    </div>
  )
}
