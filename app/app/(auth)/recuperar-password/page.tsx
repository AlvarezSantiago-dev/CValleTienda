import Link from 'next/link'
import { solicitarRecuperacionAction } from '@/app/actions/auth'
import { AnimatedSection } from '@/components/landing/ui/AnimatedSection'

interface Props {
  searchParams: Promise<{ error?: string; ok?: string }>
}

const inputClass =
  'w-full px-4 py-3 rounded-[var(--radius-lg)] border border-border-default text-[15px] text-fg ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary ' +
  'transition-all duration-150 placeholder:text-fg-subtle bg-surface'

export default async function RecuperarPasswordPage({ searchParams }: Props) {
  const { error, ok } = await searchParams

  if (ok) {
    return (
      <AnimatedSection delay={0.05}>
        <div className="mb-8">
          <h2 className="text-[28px] font-bold tracking-[-0.025em] text-fg mb-1.5">
            Revisá tu email
          </h2>
          <p className="text-[15px] text-fg-muted">
            Si ese email está registrado, te enviamos un enlace para restablecer tu contraseña.
            Puede tardar unos minutos.
          </p>
        </div>

        <div className="px-4 py-3 rounded-[var(--radius-lg)] bg-primary-soft border border-primary-border text-[13px] text-primary-soft-fg mb-6">
          Revisá también la carpeta de spam.
        </div>

        <p className="text-[13px] text-fg-muted text-center">
          <Link href="/login" className="text-fg-brand hover:underline font-medium">
            ← Volver al login
          </Link>
        </p>
      </AnimatedSection>
    )
  }

  return (
    <AnimatedSection delay={0.05}>
      <div className="mb-8">
        <h2 className="text-[28px] font-bold tracking-[-0.025em] text-fg mb-1.5">
          Recuperar contraseña
        </h2>
        <p className="text-[15px] text-fg-muted">
          Ingresá tu email y te enviamos un enlace para crear una nueva contraseña.
        </p>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-[var(--radius-lg)] bg-danger-soft border border-danger-border text-[13px] text-danger-soft-fg">
          {error}
        </div>
      )}

      <form action={solicitarRecuperacionAction} className="space-y-4">
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

        <button
          type="submit"
          className="w-full h-12 rounded-[var(--radius-full)] bg-fg hover:bg-fg-muted
                     text-white text-[15px] font-semibold
                     transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] mt-2"
        >
          Enviar enlace
        </button>
      </form>

      <p className="text-[13px] text-fg-muted text-center mt-7">
        <Link href="/login" className="text-fg-brand hover:underline font-medium">
          ← Volver al login
        </Link>
      </p>
    </AnimatedSection>
  )
}
