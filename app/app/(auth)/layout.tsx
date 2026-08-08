import Link from 'next/link'
import { AuthBrandPanel } from '@/components/landing/ui/AuthBrandPanel'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex">
      <AuthBrandPanel />

      <div className="flex-1 flex flex-col items-center justify-center p-8 relative min-h-screen bg-background">
        <div className="absolute top-6 left-6 lg:hidden">
          <Link
            href="/"
            className="text-[12px] text-fg-subtle hover:text-fg-muted transition-colors"
          >
            ← Inicio
          </Link>
        </div>

        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
