import { TabsConfiguracion } from '@/components/configuracion/TabsConfiguracion'
import { GestionEquipo } from '@/components/configuracion/GestionEquipo'
import { listarMiembros } from '@/app/actions/equipo'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function EquipoPage() {
  // Solo owner/admin puede acceder
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
    <div>
      <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">Configuración</h1>
      <p className="text-[13px] text-gray-400 mb-5">
        Gestión del equipo — cajeros y colaboradores de la tienda.
      </p>

      <TabsConfiguracion active="equipo" />

      <div className="max-w-2xl mt-6">
        <GestionEquipo miembrosIniciales={miembros ?? []} />
      </div>
    </div>
  )
}
