import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { loginAction } from '@/app/actions/auth'
import Link from 'next/link'
import { AnimatedSection } from '@/components/landing/ui/AnimatedSection'
import { PasswordInput } from '@/components/ui/PasswordInput'

interface Props {
  searchParams: Promise<{ error?: string; ok?: string }>
}

const inputClass =
  'w-full px-4 py-3 rounded-[var(--radius-lg)] border border-border-default text-[15px] text-fg ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary ' +
  'transition-all duration-150 placeholder:text-fg-subtle bg-surface'

export default async function LoginPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  const { error, ok } = await searchParams

  return (
    <AnimatedSection delay={0.05}>
      <div className="mb-8">
        <h2 className="text-[28px] font-bold tracking-[-0.025em] text-fg mb-1.5">
          Bienvenido de nuevo
        </h2>
        <p className="text-[15px] text-fg-muted">Ingresá a tu tienda</p>
      </div>

      {ok === 'cuenta-eliminada' && (
        <div className="mb-5 px-4 py-3 rounded-[var(--radius-lg)] bg-success-soft border border-success-border text-[13px] text-success-soft-fg">
          Tu cuenta se eliminó. Los datos de esa tienda ya no están en el sistema.
        </div>
      )}

      {error && (
        <div className="mb-5 px-4 py-3 rounded-[var(--radius-lg)] bg-danger-soft border border-danger-border text-[13px] text-danger-soft-fg">
          {error}
        </div>
      )}

      <form action={loginAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-[13px] font-medium text-fg mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@email.com"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-[13px] font-medium text-fg mb-1.5">
            Contraseña
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          className="w-full h-12 rounded-[var(--radius-full)] bg-fg hover:bg-fg-muted
                     text-white text-[15px] font-semibold
                     transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] mt-2"
        >
          Ingresar
        </button>
      </form>

      <p className="text-[13px] text-fg-muted text-center mt-5">
        <Link
          href="/recuperar-password"
          className="text-fg-subtle hover:text-fg-muted transition-colors"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </p>

      <p className="text-[13px] text-fg-muted text-center mt-3">
        ¿No tenés cuenta?{' '}
        <Link href="/registro" className="text-fg-brand hover:underline font-medium">
          Crear cuenta
        </Link>
      </p>

    </AnimatedSection>
  )
}
