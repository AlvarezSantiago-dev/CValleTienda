import Link from 'next/link'
import { ConfiguracionShell } from '@/components/configuracion/ConfiguracionShell'
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
    <ConfiguracionShell
      title="Importar productos"
      description="Cargá tus productos en masa usando una plantilla CSV para tu rubro."
      breadcrumb={
        <Link href="/configuracion/avanzado" className="text-sm text-fg-brand hover:underline">
          ← Avanzado
        </Link>
      }
    >
      {puedeUsar(planEfectivo, 'importar_csv') ? (
        <div className="space-y-4">
          <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-6">
            <DescargaTemplateCSV rubro={rubro} />
          </div>
          <div className="bg-warning-soft border border-warning-border rounded-[var(--radius-lg)] p-4">
            <h3 className="text-sm font-semibold text-warning-soft-fg mb-1">Instrucciones</h3>
            <ol className="text-sm text-warning-soft-fg list-decimal list-inside space-y-1">
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
    </ConfiguracionShell>
  )
}
