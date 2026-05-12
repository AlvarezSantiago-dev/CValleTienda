import Link from 'next/link'
import { AuthBrandPanel } from '@/components/landing/ui/AuthBrandPanel'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex">
      {/* Panel de marca — visible solo en lg+ */}
      <AuthBrandPanel />

      {/* Panel de formulario */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative min-h-screen">
        {/* Back link — solo en mobile */}
        <div className="absolute top-6 left-6 lg:hidden">
          <Link
            href="/"
            className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            ← Inicio
          </Link>
        </div>

        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
