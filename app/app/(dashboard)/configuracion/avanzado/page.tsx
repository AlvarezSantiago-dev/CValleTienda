import Link from 'next/link'
import { TabsConfiguracion } from '@/components/configuracion/TabsConfiguracion'
import { RemotoForm } from '@/components/configuracion/RemotoForm'
import { BalanzaForm } from '@/components/configuracion/BalanzaForm'
import { UpgradeBanner } from '@/components/planes/UpgradeBanner'
import { getContextoTienda } from '@/lib/supabase/context'
import { puedeUsar } from '@/lib/planes/config'
import { obtenerConfiguracionTienda, obtenerRubroTienda } from '@/lib/configuracion/queries'
import { getConfigRubro } from '@/lib/rubro/config'
import type { Rubro } from '@/lib/rubro/config'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionAvanzadoPage() {
  const [config, rubroRaw, ctx] = await Promise.all([
    obtenerConfiguracionTienda(),
    obtenerRubroTienda(),
    getContextoTienda(),
  ])
  const rubro = rubroRaw as Rubro
  const configRubro = getConfigRubro(rubro)
  const planEfectivo = ctx?.planEfectivo ?? 'basico'

  const cards = [
    {
      href: '/configuracion/avanzado/etiquetas',
      title: 'Etiquetas de producto',
      description: 'Diseñá el layout de la etiqueta que se imprime desde Productos.',
      locked: !puedeUsar(planEfectivo, 'disenador_etiquetas'),
    },
    {
      href: '/configuracion/avanzado/importar',
      title: 'Importar productos',
      description: 'Cargá productos en masa usando una plantilla CSV para tu rubro.',
      locked: !puedeUsar(planEfectivo, 'importar_csv'),
    },
    {
      href: '/configuracion/avanzado/facturacion',
      title: 'Facturación electrónica AFIP',
      description: 'Integración con AFIP/ARCA a través de TusFacturasAPP.',
      locked: !puedeUsar(planEfectivo, 'facturacion'),
    },
  ]

  return (
    <div>
      <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">Avanzado</h1>
      <p className="text-[13px] text-gray-400 mb-5">
        Configuraciones que se tocan una vez al inicio y raramente se modifican.
      </p>

      <TabsConfiguracion active="avanzado" />

      <div className="max-w-3xl mt-6 space-y-10">

        {/* ── Cards de secciones principales ───────────────────────────────── */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {cards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="group relative flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-5 hover:border-gray-300 hover:shadow-sm transition-all"
              >
                {card.locked && (
                  <span className="absolute top-3 right-3 text-xs font-medium bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                    Plan requerido
                  </span>
                )}
                <p className="text-[14px] font-semibold text-[#0A0A0A] group-hover:text-lime-700 transition-colors pr-16">
                  {card.title}
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">{card.description}</p>
                <span className="mt-auto pt-1 text-xs font-medium text-lime-600 group-hover:underline">
                  Configurar →
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Remito — solo si el rubro usa remitos ─────────────────────────── */}
        {configRubro.usarRemitos && (
          <section>
            <div className="mb-4">
              <h2 className="text-[17px] font-semibold text-[#0A0A0A] mb-0.5">Remito</h2>
              <p className="text-[13px] text-gray-400">
                Formato visual y texto legal que aparece al pie de cada remito.
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <RemotoForm initial={config} />
            </div>
          </section>
        )}

        {/* ── Balanza — solo si el rubro usa balanza ────────────────────────── */}
        {configRubro.usarBalanza && (
          <section>
            <div className="mb-4">
              <h2 className="text-[17px] font-semibold text-[#0A0A0A] mb-0.5">Balanza electrónica</h2>
              <p className="text-[13px] text-gray-400">
                Configurá cómo decodificar los códigos de barras EAN-13 de tu balanza.
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-6">
              <BalanzaForm initial={config} />
            </div>
          </section>
        )}

      </div>
    </div>
  )
}

