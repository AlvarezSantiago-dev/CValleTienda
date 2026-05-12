import { TabsConfiguracion } from '@/components/configuracion/TabsConfiguracion'
import { MetodosPagoManager } from '@/components/configuracion/MetodosPagoManager'
import { listarMetodosPago, listarCuentasFondos } from '@/lib/configuracion/queries'

export const dynamic = 'force-dynamic'

export default async function MetodosPagoPage() {
  const [metodos, cuentas] = await Promise.all([
    listarMetodosPago(false),
    listarCuentasFondos(true),
  ])

  return (
    <div>
      <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">Métodos de pago</h1>
      <p className="text-[13px] text-gray-400 mb-5">
        Definí cómo te pueden pagar en el POS y a qué cuenta de fondos va cada método.
      </p>

      <TabsConfiguracion active="metodos-pago" />

      <MetodosPagoManager metodos={metodos} cuentasActivas={cuentas} />
    </div>
  )
}
