import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { actualizarPasswordAction } from '@/app/actions/auth'
import { AnimatedSection } from '@/components/landing/ui/AnimatedSection'
import { PasswordInput } from '@/components/ui/PasswordInput'

interface Props {
  searchParams: Promise<{ error?: string }>
}

const inputClass =
  'w-full px-4 py-3 rounded-[var(--radius-lg)] border border-border-default text-[15px] text-fg ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary ' +
  'transition-all duration-150 placeholder:text-fg-subtle bg-surface'

export default async function ConfirmarPasswordPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/recuperar-password?error=El enlace expiró o ya fue usado. Solicitá uno nuevo.')
  }

  const { error } = await searchParams

  return (
    <AnimatedSection delay={0.05}>
      <div className="mb-8">
        <h2 className="text-[28px] font-bold tracking-[-0.025em] text-fg mb-1.5">
          Nueva contraseña
        </h2>
        <p className="text-[15px] text-fg-muted">
          Elegí una contraseña segura para tu cuenta.
        </p>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-[var(--radius-lg)] bg-danger-soft border border-danger-border text-[13px] text-danger-soft-fg">
          {error}
        </div>
      )}

      <form action={actualizarPasswordAction} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-[13px] font-medium text-fg mb-1.5">
            Nueva contraseña
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="confirm" className="block text-[13px] font-medium text-fg mb-1.5">
            Confirmar contraseña
          </label>
          <PasswordInput
            id="confirm"
            name="confirm"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Repetí la contraseña"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          className="w-full h-12 rounded-[var(--radius-full)] bg-fg hover:bg-fg-muted
                     text-white text-[15px] font-semibold
                     transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] mt-2"
        >
          Guardar contraseña
        </button>
      </form>
    </AnimatedSection>
  )
}
