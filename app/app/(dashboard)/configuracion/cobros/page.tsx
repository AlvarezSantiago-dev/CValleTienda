import { TabsConfiguracion } from '@/components/configuracion/TabsConfiguracion'
import { CuentasFondosManager } from '@/components/configuracion/CuentasFondosManager'
import { MetodosPagoManager } from '@/components/configuracion/MetodosPagoManager'
import { listarCuentasFondos, listarMetodosPago } from '@/lib/configuracion/queries'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionCobrosPage() {
  const [cuentas, metodos] = await Promise.all([
    listarCuentasFondos(false),
    listarMetodosPago(false),
  ])
  const cuentasActivas = cuentas.filter((c) => c.activo)

  return (
    <div>
      <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">Cobros</h1>
      <p className="text-[13px] text-gray-400 mb-5">
        Dónde va el dinero y cómo aceptás pagos en el POS.
      </p>

      <TabsConfiguracion active="cobros" />

      <div className="mt-6 space-y-10">
        <section>
          <div className="mb-4">
            <h2 className="text-[17px] font-semibold text-[#0A0A0A] mb-0.5">Cuentas de fondos</h2>
            <p className="text-[13px] text-gray-400">
              Efectivo, Mercado Pago, banco — los lugares donde se almacena el dinero de tu negocio.
            </p>
          </div>
          <CuentasFondosManager cuentas={cuentas} />
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-[17px] font-semibold text-[#0A0A0A] mb-0.5">Métodos de pago</h2>
            <p className="text-[13px] text-gray-400">
              Cómo te pueden pagar en el POS. Cada método apunta a una cuenta de fondos.
            </p>
          </div>
          <MetodosPagoManager metodos={metodos} cuentasActivas={cuentasActivas} />
        </section>
      </div>
    </div>
  )
}
