import { createClient } from '@/lib/supabase/server'
import { TabsProductos } from '@/components/productos/TabsProductos'
import { TaxonomyManager, type TaxonomyItem } from '@/components/productos/TaxonomyManager'
import { crearColor, actualizarColor, eliminarColor } from '@/app/actions/productos'
import { getContextoTienda } from '@/lib/supabase/context'
import { getConfigRubro } from '@/lib/rubro/config'
import type { Rubro } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function ColoresPage() {
  const [supabase, ctx] = await Promise.all([
    createClient(),
    getContextoTienda(),
  ])
  const cfg = getConfigRubro((ctx?.rubro ?? 'generico') as Rubro)

  const { data } = await supabase
    .from('colores')
    .select('*')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  const items: TaxonomyItem[] = (data ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    extra: c.hex_color,
    activo: c.activo,
  }))

  return (
    <div>
      <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">{cfg.labelVar2}s</h1>
      <p className="text-[13px] text-gray-400 mb-5">
        Definí los valores de {cfg.labelVar2.toLowerCase()} disponibles
        {cfg.usarHexVar2 ? '. El campo hex es opcional y ayuda a identificarlos visualmente.' : '.'}
      </p>

      <TabsProductos active="colores" />

      <TaxonomyManager
        titulo={cfg.labelVar2}
        items={items}
        {...(cfg.usarHexVar2 ? { extraLabel: 'Hex', extraPlaceholder: '#FF0000', extraType: 'color' as const } : {})}
        onCrear={async (nombre, extra) => {
          'use server'
          return crearColor(nombre, extra || undefined)
        }}
        onActualizar={async (id, nombre, extra) => {
          'use server'
          return actualizarColor(id, nombre, extra || undefined)
        }}
        onEliminar={async (id) => {
          'use server'
          return eliminarColor(id)
        }}
      />
    </div>
  )
}
