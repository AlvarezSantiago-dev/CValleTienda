import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DesignShowcase } from '@/components/ui/DesignShowcase'

export const metadata = { title: 'Design System — CValleTienda' }

/* ────────────────────────────────────────────────
   /design — Documentación viva del Design System v2
   Solo visible para rol owner. Spec escrita:
   referencia/design-system-v2.md
──────────────────────────────────────────────── */

const SEMANTIC_COLORS: { token: string; utility: string; uso: string }[] = [
  { token: '--background', utility: 'bg-background', uso: 'Fondo de página' },
  { token: '--surface', utility: 'bg-surface', uso: 'Cards, paneles, modales' },
  { token: '--surface-sunken', utility: 'bg-surface-sunken', uso: 'Wells, headers de tabla' },
  { token: '--primary', utility: 'bg-primary', uso: 'Acción primaria' },
  { token: '--primary-soft', utility: 'bg-primary-soft', uso: 'Tintes de marca, nav activa' },
  { token: '--accent', utility: 'bg-accent', uso: 'Indicadores, highlights' },
  { token: '--success', utility: 'bg-success', uso: 'Éxito, confirmaciones' },
  { token: '--warning', utility: 'bg-warning', uso: 'Atención, stock bajo' },
  { token: '--danger', utility: 'bg-danger', uso: 'Destructivo, errores' },
  { token: '--info', utility: 'bg-info', uso: 'Informativo' },
]

const TEXT_TOKENS: { token: string; utility: string; uso: string }[] = [
  { token: '--foreground', utility: 'text-fg', uso: 'Títulos y texto principal' },
  { token: '--fg-secondary', utility: 'text-fg-secondary', uso: 'Cuerpo secundario' },
  { token: '--fg-muted', utility: 'text-fg-muted', uso: 'Labels, captions (AA)' },
  { token: '--fg-subtle', utility: 'text-fg-subtle', uso: 'Placeholders, disabled' },
  { token: '--fg-brand', utility: 'text-fg-brand', uso: 'Texto de marca (AA)' },
]

function Foundations() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-heading font-semibold text-fg">Fundaciones — color</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SEMANTIC_COLORS.map((c) => (
            <div
              key={c.token}
              className="flex items-center gap-3 bg-surface border border-border-default rounded-[var(--radius-lg)] p-3 shadow-xs"
            >
              <div
                className="w-12 h-12 shrink-0 rounded-[var(--radius-md)] border border-border-subtle"
                style={{ background: `var(${c.token})` }}
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg font-mono truncate">{c.utility}</p>
                <p className="text-xs text-fg-muted truncate">{c.uso}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-heading font-semibold text-fg">Fundaciones — tipografía</h2>
        <div className="bg-surface border border-border-default rounded-[var(--radius-lg)] divide-y divide-border-subtle shadow-xs">
          {TEXT_TOKENS.map((t) => (
            <div key={t.token} className="flex items-baseline justify-between gap-4 px-4 py-3">
              <p className="text-sm font-medium" style={{ color: `var(${t.token})` }}>
                El total del turno es $128.450 — {t.uso}
              </p>
              <code className="text-xs font-mono text-fg-subtle shrink-0">{t.utility}</code>
            </div>
          ))}
        </div>
        <div className="bg-surface border border-border-default rounded-[var(--radius-lg)] p-6 space-y-3 shadow-xs">
          <p className="text-display font-bold text-fg">$128.450</p>
          <p className="text-title font-bold text-fg">Título de página</p>
          <p className="text-heading font-semibold text-fg">Título de sección</p>
          <p className="text-sm text-fg-secondary">Cuerpo estándar (text-sm)</p>
          <p className="text-xs text-fg-muted">Caption mínimo (text-xs)</p>
        </div>
      </section>
    </div>
  )
}

export default async function DesignSystemPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'owner') redirect('/dashboard')

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-16">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-fg-brand">
          Design System v2 · Fase 1
        </p>
        <h1 className="text-title font-bold text-fg">Documentación viva</h1>
        <p className="text-sm text-fg-muted max-w-2xl">
          Tokens + primitives v2. Spec en{' '}
          <code className="font-mono text-xs bg-surface-sunken px-1.5 py-0.5 rounded-[var(--radius-sm)]">
            referencia/design-system-v2.md
          </code>
          . Interactivo: abrí modales, drawers y toasts abajo.
        </p>
      </header>

      <Foundations />

      <hr className="border-border-default" />

      <DesignShowcase />
    </div>
  )
}
