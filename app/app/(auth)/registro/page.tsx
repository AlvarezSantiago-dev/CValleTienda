import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AnimatedSection } from '@/components/landing/ui/AnimatedSection'
import { RegistroForm } from '@/components/auth/RegistroForm'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function RegistroPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  const { error } = await searchParams

  return (
    <AnimatedSection delay={0.05}>
      {/* Encabezado */}
      <div className="mb-8">
        <h2 className="text-[28px] font-bold tracking-[-0.025em] text-[#0A0A0A] mb-1.5">
          Crear tu cuenta
        </h2>
        <p className="text-[15px] text-gray-500">
          Empezá hoy.{' '}
          <span className="text-lime-700 font-medium">Primer mes gratis.</span>
        </p>
      </div>

      <RegistroForm error={error} />

      <p className="text-[13px] text-gray-500 text-center mt-7">
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" className="text-lime-700 hover:text-lime-800 font-medium transition-colors">
          Iniciar sesión
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
