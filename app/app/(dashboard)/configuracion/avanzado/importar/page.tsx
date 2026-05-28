import Link from 'next/link'
import { TabsConfiguracion } from '@/components/configuracion/TabsConfiguracion'
import { DescargaTemplateCSV } from '@/components/configuracion/DescargaTemplateCSV'
import { UpgradeBanner } from '@/components/planes/UpgradeBanner'
import { getContextoTienda } from '@/lib/supabase/context'
import { puedeUsar } from '@/lib/planes/config'
import { obtenerRubroTienda } from '@/lib/configuracion/queries'
import type { Rubro } from '@/lib/rubro/config'

export const dynamic = 'force-dynamic'

export default async function ImportarPage() {
  const [ctx, rubroRaw] = await Promise.all([
    getContextoTienda(),
    obtenerRubroTienda(),
  ])
  const rubro = rubroRaw as Rubro
  const planEfectivo = ctx?.planEfectivo ?? 'basico'

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
        Importar productos
      </h1>
      <p className="text-[13px] text-gray-400 mb-5">
        Cargá tus productos en masa usando una plantilla CSV para tu rubro.
      </p>

      <TabsConfiguracion active="avanzado" />

      <div className="max-w-3xl mt-6">
        {puedeUsar(planEfectivo, 'importar_csv') ? (
          <div className="space-y-4">
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <DescargaTemplateCSV rubro={rubro} />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-amber-800 mb-1">Instrucciones</h3>
              <ol className="text-sm text-amber-700 list-decimal list-inside space-y-1">
                <li>Descargá la plantilla CSV para tu rubro.</li>
                <li>Abrila con Excel, Google Sheets o cualquier editor CSV.</li>
                <li>Completá los datos de tus productos (una fila por variante).</li>
                <li>Guardá como CSV y subila acá.</li>
                <li>Revisá el resumen antes de confirmar la importación.</li>
              </ol>
            </div>
          </div>
        ) : (
          <UpgradeBanner feature="importar_csv" />
        )}
      </div>
    </div>
  )
}
