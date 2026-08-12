import { redirect } from 'next/navigation'
import Link from 'next/link'
import { listarCategorias, listarTallas, listarColores } from '@/lib/productos/queries'
import { TabsProductos } from '@/components/productos/TabsProductos'
import { getContextoTienda } from '@/lib/supabase/context'
import { createClient } from '@/lib/supabase/server'
import { LIMITES_BASICO } from '@/lib/planes/config'
import { obtenerConfiguracionTienda } from '@/lib/configuracion/queries'
import { PageHeader } from '@/components/ui/PageHeader'
import { Package, Zap } from 'lucide-react'
import { CargaExpressRopa } from '@/components/productos/carga-express/CargaExpressRopa'

export const dynamic = 'force-dynamic'

export default async function CargaExpressPage() {
  const ctx = await getContextoTienda()

  if (!ctx) {
    redirect('/login')
  }

  if (ctx.rubro !== 'ropa') {
    redirect('/productos/nuevo')
  }

  if (ctx.planEfectivo === 'basico') {
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
                Tu plan Básico permite hasta {LIMITES_BASICO.max_productos} productos activos.
              </p>
            </div>
            <Link
              href="/planes"
              className="inline-flex items-center justify-center w-full h-11 bg-fg hover:bg-fg-muted text-fg-inverse text-sm font-semibold rounded-[var(--radius-full)] transition-colors"
            >
              Ver planes
            </Link>
          </div>
        </div>
      )
    }
  }

  const [categorias, tallas, colores, config] = await Promise.all([
    listarCategorias(true),
    listarTallas(true),
    listarColores(true),
    obtenerConfiguracionTienda(),
  ])

  return (
    <div>
      <PageHeader
        title="Carga express"
        description="Cargá un modelo con stock distinto por talle y color en una sola pantalla. Podés pegar el pedido en texto y corregir la matriz."
        actions={
          <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
            <Zap size={14} aria-hidden className="text-fg-brand" />
            Solo ropa
          </span>
        }
      />

      <TabsProductos active="productos" />

      <CargaExpressRopa
        categorias={categorias}
        tallas={tallas}
        colores={colores}
        margenDefault={config?.margen_ganancia_default ?? 0}
      />
    </div>
  )
}
