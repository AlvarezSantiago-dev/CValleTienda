import Link from 'next/link'
import { TabsConfiguracion } from '@/components/configuracion/TabsConfiguracion'
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
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Link
          href="/configuracion/avanzado"
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          ← Avanzado
        </Link>
      </div>
      <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">
        Facturación electrónica AFIP
      </h1>
      <p className="text-[13px] text-gray-400 mb-5">
        Integración con AFIP/ARCA a través de TusFacturasAPP.
      </p>

      <TabsConfiguracion active="avanzado" />

      <div className="max-w-2xl mt-6">
        {puedeUsar(planEfectivo, 'facturacion') ? (
          <FacturacionConfig initial={initial} />
        ) : (
          <UpgradeBanner feature="facturacion" />
        )}
      </div>
    </div>
  )
}
