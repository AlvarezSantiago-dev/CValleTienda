import { createClient } from '@/lib/supabase/server'
import { TabsProductos } from '@/components/productos/TabsProductos'
import { TaxonomyManager, type TaxonomyItem } from '@/components/productos/TaxonomyManager'
import { crearTalla, actualizarTalla, eliminarTalla } from '@/app/actions/productos'
import { getContextoTienda } from '@/lib/supabase/context'
import { getConfigRubro } from '@/lib/rubro/config'
import type { Rubro } from '@/types/database'

export const dynamic = 'force-dynamic'

export default async function TallasPage() {
  const [supabase, ctx] = await Promise.all([
    createClient(),
    getContextoTienda(),
  ])
  const cfg = getConfigRubro((ctx?.rubro ?? 'generico') as Rubro)

  const { data } = await supabase
    .from('tallas')
    .select('*')
    .eq('activo', true)
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true })

  const items: TaxonomyItem[] = (data ?? []).map((t) => ({
    id: t.id,
    nombre: t.nombre,
    extra: t.orden,
    activo: t.activo,
  }))

  const placeholderEjemplo: Record<string, string> = {
    ropa: 'Ej: XS, S, M, L, XL',
    despensa: 'Ej: Sancor, Quilmes, Marolio',
    ferreteria: 'Ej: 6mm, 8mm, 10mm',
    carniceria: 'Ej: Asado, Cuadril, Vacío',
    verduleria: 'Ej: Tomate cherry, Tomate perita',
    farmacia: 'Ej: Comprimidos, Jarabe, Crema',
    libreria: 'Ej: Bic, Faber-Castell, Staedtler',
    corralon: 'Ej: Cerro Negro, Loma Negra',
    generico: `Nuevo ${cfg.labelVar1.toLowerCase()}`,
  }
  const createPlaceholder = placeholderEjemplo[ctx?.rubro ?? 'generico'] ?? `Nuevo ${cfg.labelVar1.toLowerCase()}`

  const normalizarModo = ctx?.rubro === 'ropa' ? 'upperCase' : 'titleCase'

  return (
    <div>
      <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A] mb-1">{cfg.labelVar1}s</h1>
      <p className="text-[13px] text-gray-400 mb-5">
        Definí los valores de {cfg.labelVar1.toLowerCase()} disponibles. El campo orden controla
        cómo se muestran en los selectores.
      </p>

      <TabsProductos active="tallas" />

      <TaxonomyManager
        titulo={cfg.labelVar1}
        items={items}
        extraLabel="Orden"
        extraPlaceholder="0"
        extraType="number"
        createPlaceholder={createPlaceholder}
        normalizeMode={normalizarModo as 'titleCase' | 'upperCase'}
        onCrear={async (nombre, extra) => {
          'use server'
          return crearTalla(nombre, Number(extra) || 0)
        }}
        onActualizar={async (id, nombre, extra) => {
          'use server'
          return actualizarTalla(id, nombre, Number(extra) || 0)
        }}
        onEliminar={async (id) => {
          'use server'
          return eliminarTalla(id)
        }}
      />
    </div>
  )
}
