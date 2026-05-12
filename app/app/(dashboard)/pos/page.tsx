import { obtenerSesionAbierta } from '@/lib/caja/queries'
import {
  listarMetodosPago,
  obtenerConfiguracionTienda,
} from '@/lib/configuracion/queries'
import { POSContainer } from '@/components/pos/POSContainer'
import { EmptyState } from '@/components/ui/EmptyState'
import { createClient } from '@/lib/supabase/server'
import { listarProductosPOS } from '@/lib/pos/queries'

export default async function POSPage() {
  const sesion = await obtenerSesionAbierta()

  if (!sesion) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Punto de venta</h1>
        </div>
        <EmptyState
          icon="🔒"
          title="No hay caja abierta"
          description="Para registrar ventas necesitás abrir una sesión de caja con el efectivo de apertura."
          cta={{ label: 'Ir a caja', href: '/caja' }}
        />
      </div>
    )
  }

  const [metodos, configuracion, tiendaInfo, productos] = await Promise.all([
    listarMetodosPago(true),
    obtenerConfiguracionTienda(),
    (async () => {
      const supabase = await createClient()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return null
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('tienda_id')
        .eq('id', auth.user.id)
        .maybeSingle()
      if (!perfil) return null
      const { data: t } = await supabase
        .from('tiendas')
        .select('nombre')
        .eq('id', perfil.tienda_id)
        .maybeSingle()
      return (t as { nombre: string } | null) ?? null
    })(),
    listarProductosPOS(),
  ])

  if (metodos.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Punto de venta</h1>
        </div>
        <EmptyState
          icon="💳"
          title="No tenés métodos de pago activos"
          description="Configurá al menos un método de pago para poder cobrar."
          cta={{ label: 'Ir a configuración', href: '/configuracion/metodos-pago' }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Punto de venta</h1>
        <span className="inline-flex items-center gap-2 rounded-full bg-lime-50 px-2.5 py-1 text-xs font-semibold text-lime-700 border border-lime-200">
          <span className="h-1.5 w-1.5 rounded-full bg-lime-500 animate-pulse" />
          Caja abierta
        </span>
      </div>

      <POSContainer
        metodos={metodos}
        configuracion={configuracion}
        tiendaNombre={tiendaInfo?.nombre ?? null}
        productos={productos}
      />
    </div>
  )
}
