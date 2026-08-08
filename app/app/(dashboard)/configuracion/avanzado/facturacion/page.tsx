import Link from 'next/link'
import { ConfiguracionShell } from '@/components/configuracion/ConfiguracionShell'
import { FacturacionConfig } from '@/components/configuracion/FacturacionConfig'
import { obtenerConfigFacturacionParaForm } from '@/app/actions/facturacion'
import { getContextoTienda } from '@/lib/supabase/context'
import { puedeUsar } from '@/lib/planes/config'
import { UpgradeBanner } from '@/components/planes/UpgradeBanner'
import type { CondicionIVAEmisor } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function FacturacionAvanzadoPage() {
  const ctx = await getContextoTienda()
  const planEfectivo = ctx?.planEfectivo ?? 'basico'

  const result = await obtenerConfigFacturacionParaForm()

  const initial = result.ok && result.data
    ? {
        condicion_iva_emisor: result.data.condicion_iva_emisor as CondicionIVAEmisor,
        punto_de_venta: result.data.punto_de_venta as number | null,
        activo: Boolean(result.data.activo),
        usertoken_configurado: Boolean(result.data.usertoken_configurado),
        apitoken_configurado: Boolean(result.data.apitoken_configurado),
        apikey_configurado: Boolean(result.data.apikey_configurado),
      }
    : {
        condicion_iva_emisor: 'Monotributista' as CondicionIVAEmisor,
        punto_de_venta: null,
        activo: false,
        usertoken_configurado: false,
        apitoken_configurado: false,
        apikey_configurado: false,
      }

  return (
    <ConfiguracionShell
      title="Facturación electrónica AFIP"
      description="Integración con AFIP/ARCA a través de TusFacturasAPP."
      contentClassName="max-w-2xl"
      breadcrumb={
        <Link href="/configuracion/avanzado" className="text-sm text-fg-brand hover:underline">
          ← Avanzado
        </Link>
      }
    >
      {puedeUsar(planEfectivo, 'facturacion') ? (
        <FacturacionConfig initial={initial} />
      ) : (
        <UpgradeBanner feature="facturacion" />
      )}
    </ConfiguracionShell>
  )
}
