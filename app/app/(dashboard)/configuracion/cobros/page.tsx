import { ConfiguracionShell } from '@/components/configuracion/ConfiguracionShell'
import { CuentasFondosManager } from '@/components/configuracion/CuentasFondosManager'
import { MetodosPagoManager } from '@/components/configuracion/MetodosPagoManager'
import { PosModoCobroForm } from '@/components/configuracion/PosModoCobroForm'
import { RedondeoEfectivoForm } from '@/components/configuracion/RedondeoEfectivoForm'
import { listarMetodosPago, obtenerConfiguracionTienda } from '@/lib/configuracion/queries'
import { obtenerSaldosCuentas } from '@/lib/dashboard/queries'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionCobrosPage() {
  const [cuentas, metodos, configuracion] = await Promise.all([
    obtenerSaldosCuentas(false),
    listarMetodosPago(false),
    obtenerConfiguracionTienda(),
  ])
  const cuentasActivas = cuentas.filter((c) => c.activo)

  return (
    <ConfiguracionShell
      title="Cobros"
      description="Dónde va el dinero y cómo aceptás pagos en el POS."
      contentClassName="max-w-5xl"
    >
      <div className="space-y-10">
        <section>
          <div className="mb-4">
            <h2 className="text-[17px] font-semibold text-fg mb-0.5">
              Experiencia de cobro en el POS
            </h2>
            <p className="text-[13px] text-fg-subtle">
              Elegí cómo cobran en el punto de venta: panel lateral rápido o asistente paso a paso.
            </p>
          </div>
          <PosModoCobroForm initial={configuracion?.pos_modo_cobro} />
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-[17px] font-semibold text-fg mb-0.5">Efectivo y vuelto</h2>
            <p className="text-[13px] text-fg-subtle">
              Política de redondeo cuando no hay monedas o billetes chicos.
            </p>
          </div>
          <RedondeoEfectivoForm
            initialActivo={configuracion?.redondeo_efectivo_activo}
            initialAviso={configuracion?.redondeo_efectivo_aviso_ticket}
          />
        </section>

        <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface-sunken px-4 py-3 text-sm text-fg-secondary">
          <p className="font-medium text-fg mb-1">Cómo armar los cobros</p>
          <p>
            Primero las <strong className="font-semibold text-fg">cuentas de fondos</strong> (dónde
            queda la plata). Después los{' '}
            <strong className="font-semibold text-fg">métodos de pago</strong> (botones del POS),
            cada uno apuntando a una cuenta. Si manejás efectivo y digital por separado —o
            distintas personas con su propia caja/billetera— usá una cuenta por cada lugar y un
            método por cada forma de cobrar.
          </p>
        </div>

        <section>
          <div className="mb-4">
            <h2 className="text-[17px] font-semibold text-fg mb-0.5">Cuentas de fondos</h2>
            <p className="text-[13px] text-fg-subtle">
              Lugares donde se almacena el dinero. El saldo se actualiza con cada venta; los
              ajustes manuales van en Caja.
            </p>
          </div>
          <CuentasFondosManager cuentas={cuentas} />
        </section>

        <section>
          <div className="mb-4">
            <h2 className="text-[17px] font-semibold text-fg mb-0.5">Métodos de pago</h2>
            <p className="text-[13px] text-fg-subtle">
              Botones del POS. Cada método apunta a una cuenta de fondos.
            </p>
          </div>
          <MetodosPagoManager metodos={metodos} cuentasActivas={cuentasActivas} />
        </section>
      </div>
    </ConfiguracionShell>
  )
}
