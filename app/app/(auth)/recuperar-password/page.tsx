import Link from 'next/link'
import { solicitarRecuperacionAction } from '@/app/actions/auth'
import { AnimatedSection } from '@/components/landing/ui/AnimatedSection'

interface Props {
  searchParams: Promise<{ error?: string; ok?: string }>
}

export default async function RecuperarPasswordPage({ searchParams }: Props) {
  const { error, ok } = await searchParams

  if (ok) {
    return (
      <AnimatedSection delay={0.05}>
        <div className="mb-8">
          <h2 className="text-[28px] font-bold tracking-[-0.025em] text-[#0A0A0A] mb-1.5">
            Revisá tu email
          </h2>
          <p className="text-[15px] text-gray-500">
            Si ese email está registrado, te enviamos un enlace para restablecer tu contraseña.
            Puede tardar unos minutos.
          </p>
        </div>

        <div className="px-4 py-3 rounded-xl bg-lime-50 border border-lime-200 text-[13px] text-lime-800 mb-6">
          Revisá también la carpeta de spam.
        </div>

        <p className="text-[13px] text-gray-500 text-center">
          <Link
            href="/login"
            className="text-lime-700 hover:text-lime-800 font-medium transition-colors"
          >
            ← Volver al login
          </Link>
        </p>
      </AnimatedSection>
    )
  }

  return (
    <AnimatedSection delay={0.05}>
      <div className="mb-8">
        <h2 className="text-[28px] font-bold tracking-[-0.025em] text-[#0A0A0A] mb-1.5">
          Recuperar contraseña
        </h2>
        <p className="text-[15px] text-gray-500">
          Ingresá tu email y te enviamos un enlace para crear una nueva contraseña.
        </p>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <form action={solicitarRecuperacionAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-[13px] font-medium text-gray-700 mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@email.com"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[15px]
                       focus:outline-none focus:ring-2 focus:ring-lime-400/60 focus:border-lime-400
                       transition-all duration-150 placeholder:text-gray-300"
          />
        </div>

        <button
          type="submit"
          className="w-full h-12 rounded-full bg-[#0A0A0A] hover:bg-gray-800
                     text-white text-[15px] font-semibold
                     transition-all duration-150 hover:scale-[1.01] active:scale-[0.99] mt-2"
        >
          Enviar enlace
        </button>
      </form>

      <p className="text-[13px] text-gray-500 text-center mt-7">
        <Link
          href="/login"
          className="text-lime-700 hover:text-lime-800 font-medium transition-colors"
        >
          ← Volver al login
        </Link>
      </p>
    </AnimatedSection>
  )
}
