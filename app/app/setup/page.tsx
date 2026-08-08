import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-surface rounded-[var(--radius-lg)] shadow-xs border border-border-default p-8 max-w-md w-full text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-[var(--radius-lg)] bg-warning-soft text-warning-soft-fg flex items-center justify-center text-xl font-bold">
          !
        </div>
        <h1 className="text-xl font-semibold text-fg">Cuenta sin tienda configurada</h1>
        <p className="text-sm text-fg-muted">
          Tu cuenta existe pero no tiene una tienda asociada. Esto puede ocurrir si se
          reiniciaron los datos de la base de datos.
        </p>
        <p className="text-sm text-fg-muted">
          Cerrá sesión y registrá una nueva cuenta para crear tu tienda.
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <Link
            href="/api/signout"
            className="inline-flex items-center justify-center h-10 px-4 rounded-[var(--radius-md)] bg-fg text-white text-sm font-medium hover:bg-fg-muted transition-colors"
          >
            Cerrar sesión
          </Link>
          <Link
            href="/registro"
            className="text-sm text-fg-brand hover:underline"
          >
            Crear cuenta nueva
          </Link>
        </div>
      </div>
    </div>
  )
}
