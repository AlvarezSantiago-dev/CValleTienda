import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TabsConfiguracion } from '@/components/configuracion/TabsConfiguracion'
import { DescargaTemplateCSV } from '@/components/configuracion/DescargaTemplateCSV'
import { getContextoTienda } from '@/lib/supabase/context'
import { puedeUsar } from '@/lib/planes/config'
import { UpgradeBanner } from '@/components/planes/UpgradeBanner'
import type { Rubro } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function ImportarPage() {
  const ctx = await getContextoTienda()
  if (!puedeUsar(ctx?.planEfectivo ?? 'basico', 'importar_csv')) {
    return <UpgradeBanner feature="importar_csv" />
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!perfil) redirect('/login')

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('rubro')
    .eq('id', perfil.tienda_id)
    .maybeSingle()

  const rubro = ((tienda as { rubro?: string } | null)?.rubro ?? 'generico') as Rubro

  return (
    <div>
      <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">Importar productos</h1>
      <p className="text-[13px] text-gray-400 mb-5">
        Importá tus productos en masa usando una plantilla CSV para tu rubro.
      </p>

      <TabsConfiguracion active="importar" />

      <div className="mt-6 space-y-6">
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <h2 className="text-[15px] font-semibold text-[#0A0A0A] mb-1">Importar productos desde CSV</h2>
          <p className="text-[13px] text-gray-400 mb-4">
            Descargá la plantilla para tu rubro, completala y subila para crear productos en bloque.
          </p>
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
    </div>
  )
}
