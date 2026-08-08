import Link from 'next/link'
import { listarCategorias, listarTallas, listarColores } from '@/lib/productos/queries'
import { TabsProductos } from '@/components/productos/TabsProductos'
import { ProductoForm } from '@/components/productos/ProductoForm'
import { getContextoTienda } from '@/lib/supabase/context'
import { createClient } from '@/lib/supabase/server'
import { LIMITES_BASICO } from '@/lib/planes/config'
import { obtenerConfiguracionTienda } from '@/lib/configuracion/queries'
import { PageHeader } from '@/components/ui/PageHeader'
import { Package } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ codigo?: string }>
}

export default async function NuevoProductoPage({ searchParams }: PageProps) {
  const ctx = await getContextoTienda()

  // Guard: límite de 300 productos en plan Básico
  if (ctx && ctx.planEfectivo === 'basico') {
    const supabase = await createClient()
    const { count } = await supabase
      .from('productos')
      .select('id', { count: 'exact', head: true })
      .eq('tienda_id', ctx.tiendaId)
      .eq('activo', true)
    if ((count ?? 0) >= LIMITES_BASICO.max_productos) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-6">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="w-16 h-16 bg-warning-soft rounded-full flex items-center justify-center mx-auto text-warning-soft-fg">
              <Package size={28} aria-hidden />
            </div>
            <div className="space-y-2">
              <h2 className="text-title font-bold text-fg">Límite de productos alcanzado</h2>
              <p className="text-sm text-fg-muted leading-relaxed">
                Tu plan Básico permite hasta {LIMITES_BASICO.max_productos} productos activos. Upgrade
                a Pro para cargar productos ilimitados.
              </p>
            </div>
            <div className="bg-surface-sunken border border-border-subtle rounded-[var(--radius-lg)] px-5 py-4 text-left space-y-1">
              <p className="text-[10px] uppercase tracking-[0.10em] font-semibold text-fg-subtle">
                Plan Pro
              </p>
              <p className="text-[28px] font-bold text-fg leading-none">$39.900/mes</p>
              <p className="text-sm text-fg-muted">
                Productos ilimitados, remitos, devoluciones y más.
              </p>
            </div>
            <Link
              href="/planes"
              className="inline-flex items-center justify-center w-full h-11 bg-fg hover:bg-fg-muted text-fg-inverse text-sm font-semibold rounded-[var(--radius-full)] transition-colors"
            >
              Ver planes y solicitar upgrade
            </Link>
            <p className="text-xs text-fg-subtle">
              El upgrade lo activa el equipo de CValleTienda en menos de 24 hs.
            </p>
          </div>
        </div>
      )
    }
  }

  const [sp, categorias, tallas, colores, config] = await Promise.all([
    searchParams,
    listarCategorias(true),
    listarTallas(true),
    listarColores(true),
    obtenerConfiguracionTienda(),
  ])

  const codigoPreLlenado = sp.codigo?.trim() || undefined

  return (
    <div>
      <PageHeader
        title="Nuevo producto"
        description={
          codigoPreLlenado
            ? `Código ${codigoPreLlenado} no encontrado — completá los datos del producto.`
            : 'Cargá los datos básicos del producto y al menos una variante.'
        }
      />

      <TabsProductos active="productos" />

      <ProductoForm
        modo="crear"
        categorias={categorias}
        tallas={tallas}
        colores={colores}
        initialCodigoBarras={codigoPreLlenado}
        margenDefault={config?.margen_ganancia_default ?? 0}
      />
    </div>
  )
}
