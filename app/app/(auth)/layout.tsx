import Link from 'next/link'
import { AuthBrandPanel } from '@/components/landing/ui/AuthBrandPanel'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-surface flex">
      <AuthBrandPanel />

      <div className="flex-1 flex flex-col min-h-[100dvh] min-w-0 bg-background">
        {/* Back link in document flow — no absolute overlay on the form */}
        <div className="lg:hidden shrink-0 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-2">
          <Link
            href="/"
            className="inline-flex items-center min-h-11 text-sm text-fg-subtle hover:text-fg-muted transition-colors"
          >
            ← Inicio
          </Link>
        </div>

        <div className="flex-1 flex flex-col items-center justify-start lg:justify-center px-5 pb-8 pt-2 lg:p-8 overflow-y-auto">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  )
}
