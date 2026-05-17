import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { actualizarPasswordAction } from '@/app/actions/auth'
import { AnimatedSection } from '@/components/landing/ui/AnimatedSection'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function ConfirmarPasswordPage({ searchParams }: Props) {
  // Verificar que el usuario tiene sesión activa (viene del enlace de recuperación)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/recuperar-password?error=El enlace expiró o ya fue usado. Solicitá uno nuevo.')
  }

  const { error } = await searchParams

  return (
    <AnimatedSection delay={0.05}>
      <div className="mb-8">
        <h2 className="text-[28px] font-bold tracking-[-0.025em] text-[#0A0A0A] mb-1.5">
          Nueva contraseña
        </h2>
        <p className="text-[15px] text-gray-500">
          Elegí una contraseña segura para tu cuenta.
        </p>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-700">
          {error}
        </div>
      )}

      <form action={actualizarPasswordAction} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-[13px] font-medium text-gray-700 mb-1.5">
            Nueva contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[15px]
                       focus:outline-none focus:ring-2 focus:ring-lime-400/60 focus:border-lime-400
                       transition-all duration-150 placeholder:text-gray-300"
          />
        </div>

        <div>
          <label htmlFor="confirm" className="block text-[13px] font-medium text-gray-700 mb-1.5">
            Confirmar contraseña
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Repetí la contraseña"
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
          Guardar contraseña
        </button>
      </form>
    </AnimatedSection>
  )
}
