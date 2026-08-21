import { notFound } from 'next/navigation'
import { obtenerPedidoCatalogo } from '@/lib/catalogo/queries-interno'
import { PedidoDetalle } from '@/components/pedidos/PedidoDetalle'
import { PageHeader } from '@/components/ui/PageHeader'
import { listarMetodosPago, obtenerConfiguracionTienda } from '@/lib/configuracion/queries'
import { obtenerSesionAbiertaLite } from '@/lib/caja/queries'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PedidoPage({ params }: Props) {
  const { id } = await params
  const data = await obtenerPedidoCatalogo(id)
  if (!data) notFound()

  const [metodos, sesion, config] = await Promise.all([
    listarMetodosPago(true),
    obtenerSesionAbiertaLite(),
    obtenerConfiguracionTienda(),
  ])

  return (
    <div>
      <PageHeader title={`Pedido #${data.pedido.numero}`} className="mb-4" />
      <PedidoDetalle
        pedido={data.pedido}
        items={data.items}
        metodos={metodos}
        cajaAbierta={Boolean(sesion)}
        redondeoEfectivoActivo={config?.redondeo_efectivo_activo !== false}
        recargoCcDefault={Number(config?.recargo_cc_default ?? 0)}
      />
    </div>
  )
}
