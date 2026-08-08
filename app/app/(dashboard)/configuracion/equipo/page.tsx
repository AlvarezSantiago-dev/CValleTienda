import { ConfiguracionShell } from '@/components/configuracion/ConfiguracionShell'
import { GestionEquipo } from '@/components/configuracion/GestionEquipo'
import { listarMiembros } from '@/app/actions/equipo'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function EquipoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle()

  if (perfil?.rol === 'vendedor') redirect('/pos')

  const { data: miembros } = await listarMiembros()

  return (
    <ConfiguracionShell
      title="Equipo"
      description="Gestión del equipo — cajeros y colaboradores de la tienda."
      contentClassName="max-w-2xl"
    >
      <GestionEquipo miembrosIniciales={miembros ?? []} />
    </ConfiguracionShell>
  )
}
