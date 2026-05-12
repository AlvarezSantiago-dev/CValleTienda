import { getContextoTienda } from '@/lib/supabase/context'
import { DESCRIPCION_FEATURE, PRECIOS, type Feature } from '@/lib/planes/config'
import { SolicitarUpgradeForm } from '@/components/planes/SolicitarUpgradeForm'
import { redirect } from 'next/navigation'

const FEATURES_BASICO: Feature[] = []

const TODAS_FEATURES: { key: Feature; label: string }[] = [
  { key: 'remitos',             label: 'Remitos' },
  { key: 'devoluciones',        label: 'Devoluciones' },
  { key: 'crm_completo',        label: 'CRM de clientes completo' },
  { key: 'importar_csv',        label: 'Importar productos por CSV' },
  { key: 'disenador_etiquetas', label: 'Diseñador de etiquetas' },
  { key: 'facturacion',         label: 'Facturación electrónica' },
  { key: 'usuarios_multiples',  label: 'Usuarios múltiples' },
]

export default async function PlanesPage() {
  const ctx = await getContextoTienda()
  if (!ctx) redirect('/login')

  const yaEsPro = ctx.planEfectivo === 'pro' && !ctx.esTrial

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">
          Planes
        </h1>
        <p className="text-[13px] text-gray-400 mt-1">
          Elegí el plan que mejor se adapte a tu negocio.
        </p>
      </div>

      {ctx.esTrial && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          Estás en período de prueba gratuita. Tenés{' '}
          <strong>{ctx.diasTrial} días</strong> para explorar todas las funciones Pro.
        </div>
      )}

      {/* Tabla comparativa */}
      <div className="grid grid-cols-2 gap-4">
        {/* BÁSICO */}
        <div className="border border-gray-100 rounded-2xl p-6 space-y-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.10em] font-semibold text-gray-400">Básico</span>
            <p className="text-[28px] font-bold text-[#0A0A0A] mt-1 leading-none">{PRECIOS.basico}</p>
          </div>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-[13px] text-gray-600">
              <span className="text-lime-600">✓</span>
              POS completo
            </li>
            <li className="flex items-center gap-2 text-[13px] text-gray-600">
              <span className="text-lime-600">✓</span>
              Hasta 300 productos
            </li>
            <li className="flex items-center gap-2 text-[13px] text-gray-600">
              <span className="text-lime-600">✓</span>
              Caja e historial de ventas
            </li>
            <li className="flex items-center gap-2 text-[13px] text-gray-600">
              <span className="text-lime-600">✓</span>
              Clientes básico
            </li>
            <li className="flex items-center gap-2 text-[13px] text-gray-600">
              <span className="text-lime-600">✓</span>
              Stock y alertas
            </li>
            {TODAS_FEATURES.map(f => (
              <li key={f.key} className="flex items-center gap-2 text-[13px] text-gray-300">
                <span>✗</span>
                {f.label}
              </li>
            ))}
          </ul>
          {ctx.plan === 'basico' && !ctx.esTrial && (
            <span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 text-xs font-semibold rounded-full">
              Plan actual
            </span>
          )}
        </div>

        {/* PRO */}
        <div className="border border-[#0A0A0A] rounded-2xl p-6 space-y-4 relative">
          <div className="absolute top-4 right-4">
            <span className="bg-lime-50 border border-lime-200 px-2 py-0.5 text-xs font-semibold text-lime-700 rounded-full">
              Recomendado
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-[0.10em] font-semibold text-gray-400">Pro</span>
            <p className="text-[28px] font-bold text-[#0A0A0A] mt-1 leading-none">{PRECIOS.pro}</p>
          </div>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-[13px] text-gray-600">
              <span className="text-lime-600">✓</span>
              Todo lo del plan Básico
            </li>
            <li className="flex items-center gap-2 text-[13px] text-gray-600">
              <span className="text-lime-600">✓</span>
              Productos ilimitados
            </li>
            {TODAS_FEATURES.map(f => (
              <li key={f.key} className="flex items-center gap-2 text-[13px] text-gray-600">
                <span className="text-lime-600">✓</span>
                {f.label}
              </li>
            ))}
          </ul>
          {yaEsPro && (
            <span className="inline-block bg-lime-50 border border-lime-200 text-lime-700 px-2 py-0.5 text-xs font-semibold rounded-full">
              Plan actual
            </span>
          )}
        </div>
      </div>

      {/* Formulario solicitud */}
      {!yaEsPro && (
        <div className="border border-gray-100 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-[16px] font-semibold text-[#0A0A0A]">Solicitar upgrade a Pro</h2>
            <p className="text-[13px] text-gray-400 mt-1">
              El upgrade lo activa el equipo de CValleTienda. Te confirmamos por WhatsApp en menos de 24 hs.
            </p>
          </div>
          <SolicitarUpgradeForm />
        </div>
      )}

      {yaEsPro && (
        <div className="rounded-xl bg-lime-50 border border-lime-200 px-4 py-3 text-sm text-lime-800">
          Ya tenés el plan Pro activo. ¡Aprovechá todas las funciones!
        </div>
      )}
    </div>
  )
}
