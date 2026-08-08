import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.SUPERADMIN_EMAIL) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-border-default px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.10em] font-semibold text-fg-subtle">
              Superadmin
            </p>
            <h1 className="text-[18px] font-bold text-fg mt-0.5">CValleTienda Admin</h1>
          </div>
          <span className="bg-fg text-white text-[10px] font-bold px-2 py-1 rounded-[var(--radius-full)] uppercase tracking-wide">
            Admin
          </span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
