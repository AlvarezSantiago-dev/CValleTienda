import Link from 'next/link'
import { AnimatedSection } from '@/components/landing/ui/AnimatedSection'

interface Props {
  searchParams: Promise<{ email?: string }>
}

export default async function ConfirmarEmailPage({ searchParams }: Props) {
  const { email } = await searchParams

  return (
    <AnimatedSection delay={0.05} className="text-center">
      {/* Badge */}
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lime-50 border border-lime-200 text-[12px] font-semibold text-lime-700 mb-6">
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
          <path d="M2 6l3 3 5-5" stroke="#65A30D" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Link enviado
      </div>

      {/* SVG sobre */}
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 bg-lime-50 rounded-2xl flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#65A30D" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
        </div>
      </div>

      {/* Título */}
      <h2 className="text-[26px] font-bold tracking-[-0.025em] text-[#0A0A0A] mb-2">
        Revisá tu email
      </h2>
      <p className="text-[14px] text-gray-500 mb-1">
        Te enviamos un enlace de confirmación a:
      </p>
      {email && (
        <p className="text-[15px] font-semibold text-lime-700 mb-5">{email}</p>
      )}
      <p className="text-[13px] text-gray-400 leading-relaxed mb-8 max-w-xs mx-auto">
        Hacé clic en el enlace del email para activar tu cuenta y acceder al sistema.
      </p>

      <div className="space-y-4">
        <p className="text-[12px] text-gray-400">
          ¿No recibiste el email? Revisá la carpeta de spam o contactanos.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center h-10 px-6 rounded-full
                     border border-gray-200 text-[13px] text-gray-600
                     hover:bg-gray-50 hover:border-gray-300 transition-all duration-150"
        >
          ← Volver al inicio
        </Link>
      </div>
    </AnimatedSection>
  )
}
