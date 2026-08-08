import { createClient } from '@/lib/supabase/server'
import { BuscadorPrecios } from '@/components/precios/BuscadorPrecios'
import { PageHeader } from '@/components/ui/PageHeader'

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
    <div className="min-h-[calc(100vh-8rem)] flex flex-col justify-start">
      <PageHeader
        title="Lista de precios"
        description="Escaneá un código de barras o buscá por nombre para consultar el precio al instante."
        className="mb-5"
      />

      <BuscadorPrecios puedeEditarProductos={puedeEditarProductos} />
    </div>
  )
}
