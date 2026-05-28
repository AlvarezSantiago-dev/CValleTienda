import { createClient } from '@/lib/supabase/server'
import { TabsProductos } from '@/components/productos/TabsProductos'
import { TaxonomyManager, type TaxonomyItem } from '@/components/productos/TaxonomyManager'
import { crearCategoria, actualizarCategoria, eliminarCategoria } from '@/app/actions/productos'

export const dynamic = 'force-dynamic'

export default async function CategoriasPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('categorias')
    .select('*')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  const items: TaxonomyItem[] = (data ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    extra: c.descripcion,
    activo: c.activo,
  }))

  return (
    <div>
      <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">Categorías</h1>
      <p className="text-[13px] text-gray-400 mb-5">
        Agrupá tus productos para filtrarlos rápido en el POS y en el catálogo.
      </p>

      <TabsProductos active="categorias" />

      <TaxonomyManager
        titulo="Categoría"
        items={items}
        extraLabel="Descripción"
        extraPlaceholder="Opcional"
        extraType="text"
        normalizeMode="titleCase"
        onCrear={async (nombre, extra) => {
          'use server'
          return crearCategoria(nombre, extra || undefined)
        }}
        onActualizar={async (id, nombre, extra) => {
          'use server'
          return actualizarCategoria(id, nombre, extra || undefined)
        }}
        onEliminar={async (id) => {
          'use server'
          return eliminarCategoria(id)
        }}
      />
    </div>
  )
}
