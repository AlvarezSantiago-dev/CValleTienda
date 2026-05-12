import { notFound } from 'next/navigation'
import Link from 'next/link'
import { obtenerRemito } from '@/lib/remitos/queries'
import { RemitoImprimible } from '@/components/remitos/RemitoImprimible'
import { RemitoAcciones } from '@/components/remitos/RemitoAcciones'
import { getContextoTienda } from '@/lib/supabase/context'
import { obtenerConfiguracionTienda } from '@/lib/configuracion/queries'

const ESTADO_BADGE: Record<string, string> = {
  borrador:  'bg-gray-100 text-gray-600',
  emitido:   'bg-[#0A0A0A]/5 text-[#0A0A0A]',
  entregado: 'bg-lime-50 text-lime-700 border border-lime-200',
  anulado:   'bg-red-50 text-red-600 border border-red-200',
}
const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador', emitido: 'Emitido', entregado: 'Entregado', anulado: 'Anulado',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function RemitoDetallePage({ params }: Props) {
  const { id } = await params
  const remito = await obtenerRemito(id)
  if (!remito) notFound()

  const [ctx, config] = await Promise.all([
    getContextoTienda(),
    obtenerConfiguracionTienda(),
  ])

  // Datos del remitente desde contexto de tienda + config
  const supabase = await (await import('@/lib/supabase/server')).createClient()
  const { data: tiendaData } = await supabase
    .from('tiendas')
    .select('nombre, telefono, direccion')
    .eq('id', ctx?.tiendaId ?? '')
    .maybeSingle()
  const t = tiendaData as { nombre: string; telefono: string | null; direccion: string | null } | null

  const tiendaNombre    = t?.nombre ?? ctx?.nombre ?? 'Mi Tienda'
  const tiendaTelefono  = t?.telefono ?? null
  const tiendaDireccion = t?.direccion ?? null
  const razonSocial     = (config as { razon_social?: string | null } | null)?.razon_social ?? null
  const cuit            = (config as { cuit?: string | null } | null)?.cuit ?? null
  const textoPie        = (config as { texto_pie?: string | null } | null)?.texto_pie ?? null
  const logoUrl         = (config as { logo_url?: string | null } | null)?.logo_url ?? null

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div className="space-y-6 print:space-y-2">
      {/* Encabezado — oculto al imprimir */}
      <div className="print:hidden flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/remitos" className="text-sm text-lime-700 hover:text-lime-800">
              ← Remitos
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">
              Remito #{String(remito.numero_remito).padStart(4, '0')}
            </h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${ESTADO_BADGE[remito.estado]}`}>
              {ESTADO_LABEL[remito.estado] ?? remito.estado}
            </span>
          </div>
          <p className="text-[13px] text-gray-400 mt-0.5">Creado el {formatDate(remito.created_at)}</p>
        </div>
        <RemitoAcciones remitoId={remito.id} estadoActual={remito.estado} />
      </div>

      {/* Datos del remito — pantalla */}
      <div className="print:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-2">
          <h2 className="text-[10px] uppercase tracking-[0.10em] font-semibold text-gray-400">Destinatario</h2>
          <p className="font-medium text-gray-900">{remito.destinatario}</p>
          {remito.direccion_entrega && <p className="text-sm text-gray-600">{remito.direccion_entrega}</p>}
          {remito.telefono_entrega  && <p className="text-sm text-gray-600">Tel: {remito.telefono_entrega}</p>}
          {remito.fecha_entrega     && <p className="text-sm text-gray-500">Entrega: {formatDate(remito.fecha_entrega)}</p>}
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-5 space-y-2">
          <h2 className="text-[10px] uppercase tracking-[0.10em] font-semibold text-gray-400">Información del remito</h2>
          {remito.venta_numero && (
            <p className="text-sm">
              Venta:{' '}
              <Link href={`/ventas/${remito.venta_numero}`} className="text-lime-700 hover:underline">
                #{remito.venta_numero}
              </Link>
            </p>
          )}
          {remito.usuario_nombre && <p className="text-sm text-gray-600">Operador: {remito.usuario_nombre}</p>}
          {remito.observaciones   && (
            <p className="text-sm text-gray-600 italic">&ldquo;{remito.observaciones}&rdquo;</p>
          )}
        </div>
      </div>

      {/* Items — pantalla */}
      {remito.items.length > 0 && (
        <div className="print:hidden bg-white border border-gray-100 rounded-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">
              <tr>
                <th className="px-3 py-2">Producto</th>
                <th className="px-3 py-2 text-center">Cantidad</th>
                <th className="px-3 py-2 text-right">Precio unit.</th>
                <th className="px-3 py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {remito.items.map((item, i) => (
                <tr key={i}>
                  <td className="px-3 py-2">
                    <span className="font-medium">{item.nombre_producto}</span>
                    {(item.talla || item.color) && (
                      <span className="text-gray-500 ml-1">
                        ({[item.talla, item.color].filter(Boolean).join(' / ')})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">{item.cantidad}</td>
                  <td className="px-3 py-2 text-right">${Number(item.precio_unitario).toFixed(2)}</td>
                  <td className="px-3 py-2 text-right font-medium">${Number(item.total_linea).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={3} className="px-3 py-2 text-right font-semibold text-sm">Total</td>
                <td className="px-3 py-2 text-right font-bold">
                  ${remito.items.reduce((a, i) => a + Number(i.total_linea), 0).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Versión imprimible */}
      <div className="print:block">
        <RemitoImprimible
          remito={remito}
          tiendaNombre={tiendaNombre}
          tiendaTelefono={tiendaTelefono}
          tiendaDireccion={tiendaDireccion}
          razonSocial={razonSocial}
          cuit={cuit}
          textoPie={textoPie}
          logoUrl={logoUrl}
        />
      </div>
    </div>
  )
}
