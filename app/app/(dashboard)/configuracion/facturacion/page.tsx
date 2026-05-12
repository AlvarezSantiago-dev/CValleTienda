import { TabsConfiguracion } from '@/components/configuracion/TabsConfiguracion'
import { FacturacionConfig } from '@/components/configuracion/FacturacionConfig'
import { obtenerConfigFacturacionParaForm } from '@/app/actions/facturacion'
import { getContextoTienda } from '@/lib/supabase/context'
import { puedeUsar } from '@/lib/planes/config'
import { UpgradeBanner } from '@/components/planes/UpgradeBanner'
import type { CondicionIVAEmisor } from '@/types/database'

export default async function FacturacionPage() {
  const ctx = await getContextoTienda()
  if (!puedeUsar(ctx?.planEfectivo ?? 'basico', 'facturacion')) {
    return <UpgradeBanner feature="facturacion" />
  }
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
    <div>
      <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">Facturación electrónica</h1>
      <p className="text-[13px] text-gray-400 mb-5">
        Integración con AFIP/ARCA a través de TusFacturasAPP.
      </p>
      <TabsConfiguracion active="facturacion" />
      <div className="max-w-2xl">
        <FacturacionConfig initial={initial} />
      </div>
    </div>
  )
}
