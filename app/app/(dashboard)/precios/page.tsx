import { createClient } from '@/lib/supabase/server'
import { BuscadorPrecios } from '@/components/precios/BuscadorPrecios'

export default async function PreciosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let puedeEditarProductos = false
  if (user) {
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle()
    puedeEditarProductos = perfil?.rol === 'owner' || perfil?.rol === 'admin'
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col justify-start space-y-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Lista de precios</h1>
        <p className="text-[13px] text-gray-400 mt-1">
          Escaneá un código de barras o buscá por nombre para consultar el precio al instante.
        </p>
      </div>

      <BuscadorPrecios puedeEditarProductos={puedeEditarProductos} />
    </div>
  )
}
