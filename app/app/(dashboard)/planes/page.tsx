import { getContextoTienda } from '@/lib/supabase/context'
import type { Feature } from '@/lib/planes/config'
import { SolicitarUpgradeForm } from '@/components/planes/SolicitarUpgradeForm'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'

const TODAS_FEATURES: { key: Feature; label: string }[] = [
  { key: 'remitos', label: 'Remitos' },
  { key: 'devoluciones', label: 'Devoluciones' },
  { key: 'crm_completo', label: 'CRM de clientes completo' },
  { key: 'importar_csv', label: 'Importar productos por CSV' },
  { key: 'disenador_etiquetas', label: 'Diseñador de etiquetas' },
  { key: 'facturacion', label: 'Facturación electrónica' },
  { key: 'usuarios_multiples', label: 'Usuarios múltiples' },
]

export default async function PlanesPage() {
  const ctx = await getContextoTienda()
  if (!ctx) redirect('/login')

  const yaEsPro = ctx.planEfectivo === 'pro' && !ctx.esTrial

  return (
    <div className="space-y-8 w-full min-w-0 max-w-4xl">
      <PageHeader
        className="mb-0"
        title="Planes"
        description="Elegí el plan que mejor se adapte a tu negocio."
      />

      <div className="rounded-[var(--radius-lg)] bg-surface-sunken border border-border-subtle px-4 py-3 text-[13px] text-fg leading-relaxed">
        El acceso se renueva cada mes. Si vence, el sistema se pausa hasta confirmar el pago.
        {ctx.acceso_hasta && ctx.tieneAcceso && (
          <>
            {' '}
            Acceso vigente hasta{' '}
            <strong>
              {new Date(ctx.acceso_hasta).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </strong>
            .
          </>
        )}
      </div>

      {ctx.esTrial && (
        <div className="rounded-[var(--radius-lg)] bg-warning-soft border border-warning-border px-4 py-3 text-sm text-warning-soft-fg">
          Estás en período de prueba gratuita. Tenés{' '}
          <strong>{ctx.diasTrial} días</strong> para explorar todas las funciones Pro.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="border border-border-subtle rounded-[var(--radius-lg)] p-6 space-y-4 bg-surface">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase tracking-[0.10em] font-semibold text-fg-subtle">
              Básico
            </span>
            {ctx.plan === 'basico' && !ctx.esTrial && (
              <Badge variant="neutral">Plan actual</Badge>
            )}
          </div>
          <ul className="space-y-2">
            {[
              'POS completo',
              'Hasta 300 productos',
              'Caja e historial de ventas',
              'Clientes básico',
              'Stock y alertas',
            ].map((label) => (
              <li key={label} className="flex items-center gap-2 text-[13px] text-fg-muted">
                <span className="text-fg-brand">✓</span>
                {label}
              </li>
            ))}
            {TODAS_FEATURES.map((f) => (
              <li key={f.key} className="flex items-center gap-2 text-[13px] text-fg-subtle">
                <span>✗</span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="border-2 border-fg rounded-[var(--radius-lg)] p-6 space-y-4 bg-surface relative">
          <div className="absolute top-4 right-4">
            <Badge variant="brand">Recomendado</Badge>
          </div>
          <div className="flex items-center justify-between gap-2 pr-24">
            <span className="text-[10px] uppercase tracking-[0.10em] font-semibold text-fg-subtle">
              Pro
            </span>
            {yaEsPro && <Badge variant="success">Plan actual</Badge>}
          </div>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-[13px] text-fg-muted">
              <span className="text-fg-brand">✓</span>
              Todo lo del plan Básico
            </li>
            <li className="flex items-center gap-2 text-[13px] text-fg-muted">
              <span className="text-fg-brand">✓</span>
              Productos ilimitados
            </li>
            {TODAS_FEATURES.map((f) => (
              <li key={f.key} className="flex items-center gap-2 text-[13px] text-fg-muted">
                <span className="text-fg-brand">✓</span>
                {f.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {!yaEsPro && (
        <div className="border border-border-subtle rounded-[var(--radius-lg)] p-6 space-y-4 bg-surface">
          <div>
            <h2 className="text-[16px] font-semibold text-fg">Solicitar upgrade a Pro</h2>
            <p className="text-[13px] text-fg-subtle mt-1">
              El upgrade lo activa el equipo de CValleTienda. Te confirmamos por WhatsApp en menos de
              24 hs.
            </p>
          </div>
          <SolicitarUpgradeForm />
        </div>
      )}

      {yaEsPro && (
        <div className="rounded-[var(--radius-lg)] bg-primary-soft border border-primary-border px-4 py-3 text-sm text-primary-soft-fg">
          Ya tenés el plan Pro activo. ¡Aprovechá todas las funciones!
        </div>
      )}
    </div>
  )
}
