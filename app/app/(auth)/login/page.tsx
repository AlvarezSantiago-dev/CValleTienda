import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { loginAction } from '@/app/actions/auth'
import Link from 'next/link'
import { AnimatedSection } from '@/components/landing/ui/AnimatedSection'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  const { error } = await searchParams

  return (
    <AnimatedSection delay={0.05}>
      {/* Encabezado */}
      <div className="mb-8">
        <h2 className="text-[28px] font-bold tracking-[-0.025em] text-[#0A0A0A] mb-1.5">
          Bienvenido de nuevo
        </h2>
        <p className="text-[15px] text-gray-500">
          Ingresá a tu tienda
        </p>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <form action={loginAction} className="space-y-4">
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

        <div>
          <label htmlFor="password" className="block text-[13px] font-medium text-gray-700 mb-1.5">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
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
          Ingresar
        </button>
      </form>

      <p className="text-[13px] text-gray-500 text-center mt-5">
        <Link
          href="/recuperar-password"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </p>

      <p className="text-[13px] text-gray-500 text-center mt-3">
        ¿No tenés cuenta?{' '}
        <Link href="/registro" className="text-lime-700 hover:text-lime-800 font-medium transition-colors">
          Crear cuenta
        </Link>
      </p>

      <div className="text-center mt-4">
        <Link href="/" className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors">
          ← Volver al inicio
        </Link>
      </div>
    </AnimatedSection>
  )
}
