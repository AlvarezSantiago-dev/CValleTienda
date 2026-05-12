import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Si no hay sesión en absoluto, mandar al login
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-xl font-semibold text-gray-900">Cuenta sin tienda configurada</h1>
        <p className="text-sm text-gray-500">
          Tu cuenta existe pero no tiene una tienda asociada. Esto puede ocurrir si se
          reiniciaron los datos de la base de datos.
        </p>
        <p className="text-sm text-gray-500">
          Cerrá sesión y registrá una nueva cuenta para crear tu tienda.
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <Link
            href="/api/signout"
            className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Cerrar sesión
          </Link>
          <Link
            href="/registro"
            className="text-sm text-indigo-600 hover:underline"
          >
            Crear cuenta nueva
          </Link>
        </div>
      </div>
    </div>
  )
}
