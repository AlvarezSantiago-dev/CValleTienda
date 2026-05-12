import Link from 'next/link'
import { notFound } from 'next/navigation'
import { obtenerDevolucionCompleta } from '@/lib/devoluciones/queries'
import { obtenerConfiguracionTienda } from '@/lib/configuracion/queries'
import { TicketDevolucion } from '@/components/devoluciones/TicketDevolucion'
import { PrintButtonClient } from '@/components/ventas/PrintButtonClient'
import { createClient } from '@/lib/supabase/server'

interface DevolucionDetallePageProps {
  params: Promise<{ id: string }>
}

export default async function DevolucionDetallePage({
  params,
}: DevolucionDetallePageProps) {
  const { id } = await params

  const devolucion = await obtenerDevolucionCompleta(id)
  if (!devolucion) notFound()

  const configuracion = await obtenerConfiguracionTienda()

  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  let tiendaNombre: string | null = null
  if (auth.user) {
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('tienda_id')
      .eq('id', auth.user.id)
      .maybeSingle()
    if (perfil) {
      const { data: t } = await supabase
        .from('tiendas')
        .select('nombre')
        .eq('id', perfil.tienda_id)
        .maybeSingle()
      tiendaNombre = (t as { nombre: string } | null)?.nombre ?? null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2 print:hidden">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">
            Devolución #{devolucion.numero_devolucion}
          </h1>
          <p className="text-[13px] text-gray-400 mt-1">
            {new Date(devolucion.created_at).toLocaleString('es-AR', {
              dateStyle: 'long',
              timeStyle: 'short',
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/devoluciones"
            className="inline-flex items-center justify-center h-10 px-4 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700"
          >
            ← Volver
          </Link>
          <PrintButtonClient tipo="devolucion" id={devolucion.id} />
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-6 print:border-0 print:p-0">
        <TicketDevolucion
          devolucion={devolucion}
          configuracion={configuracion}
          tienda_nombre={tiendaNombre}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
        <div className="bg-white border border-gray-100 rounded-xl px-6 py-4">
          <p className="text-[10px] uppercase tracking-[0.10em] text-gray-400 font-semibold">
            Venta original
          </p>
          <Link
            href={`/ventas/${devolucion.venta_id}`}
            className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-lime-700 hover:underline"
          >
            Venta #{devolucion.numero_ticket ?? '—'}
            <span aria-hidden>→</span>
          </Link>
        </div>

        {devolucion.cliente_id && devolucion.cliente_nombre && (
          <div className="bg-white border border-gray-100 rounded-xl px-6 py-4">
            <p className="text-[10px] uppercase tracking-[0.10em] text-gray-400 font-semibold">
              Cliente
            </p>
            <Link
              href={`/clientes/${devolucion.cliente_id}`}
              className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-lime-700 hover:underline"
            >
              {devolucion.cliente_nombre}
              <span aria-hidden>→</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
