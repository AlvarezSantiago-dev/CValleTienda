import { TabsConfiguracion } from '@/components/configuracion/TabsConfiguracion'
import { CuentasFondosManager } from '@/components/configuracion/CuentasFondosManager'
import { listarCuentasFondos } from '@/lib/configuracion/queries'

export const dynamic = 'force-dynamic'

export default async function CuentasFondosPage() {
  const cuentas = await listarCuentasFondos(false)

  return (
    <div>
      <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">Cuentas de fondos</h1>
      <p className="text-[13px] text-gray-400 mb-5">
        Lugares donde se almacena el dinero de tu negocio: efectivo, Mercado Pago, banco.
      </p>

      <TabsConfiguracion active="cuentas-fondos" />

      <CuentasFondosManager cuentas={cuentas} />
    </div>
  )
}
