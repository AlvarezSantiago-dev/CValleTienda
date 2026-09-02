import { createClient } from '@/lib/supabase/server'
import { TabsProductos } from '@/components/productos/TabsProductos'
import { TaxonomyManager, type TaxonomyItem } from '@/components/productos/TaxonomyManager'
import { crearColor, actualizarColor, eliminarColor } from '@/app/actions/productos'
import { getContextoTienda } from '@/lib/supabase/context'
import { getConfigRubro, pluralLabelVar } from '@/lib/rubro/config'
import type { Rubro } from '@/types/database'
import { PageHeader } from '@/components/ui/PageHeader'

export const dynamic = 'force-dynamic'

export default async function ColoresPage() {
  const [supabase, ctx] = await Promise.all([
    createClient(),
    getContextoTienda(),
  ])
  const cfg = getConfigRubro((ctx?.rubro ?? 'generico') as Rubro)

  const { data } = await supabase
    .from('colores')
    .select('id, nombre, hex_color, activo')
    .eq('activo', true)
    .order('nombre', { ascending: true })

  const items: TaxonomyItem[] = (data ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre,
    extra: c.hex_color,
    activo: c.activo,
  }))

  const placeholderEjemplo: Record<string, string> = {
    ropa: 'Ej: Negro, Blanco, Rojo',
    despensa: 'Ej: 1 L, 500 ml, Light',
    ferreteria: 'Ej: Acero, Bronce, PVC',
    carniceria: 'Ej: Novillo, Ternera',
    verduleria: 'Ej: Mendoza, Tucumán',
    farmacia: 'Ej: Genfar, Bagó',
    libreria: 'Ej: 0.7 mm, 2B',
    corralon: 'Ej: Primera, Segunda',
    distribuidora: 'Ej: 2.25 L, 600 ml, Común, Zero',
    generico: `Nuevo ${cfg.labelVar2.toLowerCase()}`,
  }
  const createPlaceholder = placeholderEjemplo[ctx?.rubro ?? 'generico'] ?? `Nuevo ${cfg.labelVar2.toLowerCase()}`

  return (
    <div>
      <PageHeader
        title={pluralLabelVar(cfg.labelVar2)}
        description={`Definí los valores de ${cfg.labelVar2.toLowerCase()} disponibles${cfg.usarHexVar2 ? '. El campo hex es opcional y ayuda a identificarlos visualmente.' : '.'}`}
      />

      <TabsProductos active="colores" />

      <TaxonomyManager
        titulo={cfg.labelVar2}
        items={items}
        {...(cfg.usarHexVar2 ? { extraLabel: 'Hex', extraPlaceholder: '#FF0000', extraType: 'color' as const } : {})}
        createPlaceholder={createPlaceholder}
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
