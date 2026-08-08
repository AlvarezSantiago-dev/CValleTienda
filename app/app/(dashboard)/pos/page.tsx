import { Lock, CreditCard } from 'lucide-react'
import { obtenerSesionAbierta } from '@/lib/caja/queries'
import {
  listarMetodosPago,
  obtenerConfiguracionTienda,
} from '@/lib/configuracion/queries'
import { POSContainer } from '@/components/pos/POSContainer'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/server'
import { listarProductosPOS } from '@/lib/pos/queries'

export default async function POSPage() {
  const sesion = await obtenerSesionAbierta()

  if (!sesion) {
    return (
      <div>
        <PageHeader title="Punto de venta" />
        <EmptyState
          icon={<Lock size={20} aria-hidden />}
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
      <div>
        <PageHeader title="Punto de venta" />
        <EmptyState
          icon={<CreditCard size={20} aria-hidden />}
          title="No tenés métodos de pago activos"
          description="Configurá al menos un método de pago para poder cobrar."
          cta={{ label: 'Ir a configuración', href: '/configuracion/metodos-pago' }}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Punto de venta"
        className="mb-4"
        actions={
          <Badge variant="brand">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" aria-hidden />
            Caja abierta
          </Badge>
        }
      />

      <POSContainer
        metodos={metodos}
        configuracion={configuracion}
        tiendaNombre={tiendaInfo?.nombre ?? null}
        productos={productos}
      />
    </div>
  )
}
