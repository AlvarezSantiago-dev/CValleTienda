import { notFound } from 'next/navigation'
import Link from 'next/link'
import { obtenerRemito } from '@/lib/remitos/queries'
import { RemitoImprimible } from '@/components/remitos/RemitoImprimible'
import { RemitoImprimibleClasico } from '@/components/remitos/RemitoImprimibleClasico'
import { RemitoAcciones } from '@/components/remitos/RemitoAcciones'
import { getContextoTienda } from '@/lib/supabase/context'
import { obtenerConfiguracionTienda, listarMetodosPago } from '@/lib/configuracion/queries'
import { sincronizarCargosRemitosCliente } from '@/app/actions/cuenta-corriente'

import { formatDate } from '@/lib/format'
import { PageHeader } from '@/components/ui/PageHeader'
import { Badge, type BadgeVariant } from '@/components/ui/Badge'

const ESTADO_VARIANT: Record<string, BadgeVariant> = {
  borrador: 'neutral',
  emitido: 'info',
  entregado: 'success',
  anulado: 'danger',
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

  if (remito.tipo === 'cuenta_corriente' && remito.cliente_id) {
    await sincronizarCargosRemitosCliente(remito.cliente_id)
  }

  const [ctx, config, metodosPago] = await Promise.all([
    getContextoTienda(),
    obtenerConfiguracionTienda(),
    listarMetodosPago(true),
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
  const direccionLegal  = (config as { direccion_legal?: string | null } | null)?.direccion_legal ?? null
  const tiendaDireccion = direccionLegal ?? t?.direccion ?? null
  const razonSocial     = (config as { razon_social?: string | null } | null)?.razon_social ?? null
  const cuit            = (config as { cuit?: string | null } | null)?.cuit ?? null
  const textoPie          = (config as { texto_pie?: string | null } | null)?.texto_pie ?? null
  const textoPieRemito     = (config as { texto_pie_remito?: string | null } | null)?.texto_pie_remito ?? null
  const logoUrl            = (config as { logo_url?: string | null } | null)?.logo_url ?? null
  const estiloRemito       = (config as { estilo_remito?: 'moderno' | 'clasico' } | null)?.estilo_remito ?? 'moderno'
  const textoEncabezado    = (config as { texto_encabezado?: string | null } | null)?.texto_encabezado ?? null

  return (
    <div className="space-y-6 print:space-y-2">
      <PageHeader
        className="print:hidden mb-0"
        title={`Remito #${String(remito.numero_remito).padStart(4, '0')}`}
        description={`Creado el ${formatDate(remito.created_at)}`}
        breadcrumb={
          <Link href="/remitos" className="text-sm text-fg-brand hover:underline">
            ← Remitos
          </Link>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={ESTADO_VARIANT[remito.estado] ?? 'neutral'}>
              {ESTADO_LABEL[remito.estado] ?? remito.estado}
            </Badge>
            <RemitoAcciones
              remitoId={remito.id}
              estadoActual={remito.estado}
              tipo={remito.tipo ?? 'entrega'}
              estadoCobro={remito.estado_cobro ?? 'no_aplica'}
              montoTotal={remito.monto_total ?? 0}
              montoCobrado={remito.monto_cobrado ?? 0}
              metodosPago={metodosPago.map((m) => ({ id: m.id, nombre: m.nombre }))}
            />
          </div>
        }
      />

      {/* Panel cobro — solo cuenta corriente */}
      {remito.tipo === 'cuenta_corriente' && (
        <div className="print:hidden bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
          <div className="px-5 py-3 border-b border-border-subtle">
            <h2 className="text-[11px] uppercase tracking-[0.07em] font-semibold text-fg-subtle">Estado de cobro</h2>
          </div>
          <div className="px-5 py-4 flex flex-wrap gap-6">
            <div>
              <span className="text-[11px] uppercase tracking-[0.06em] font-semibold text-fg-subtle block mb-1">Total</span>
              <span className="text-[18px] font-bold text-fg tabular-nums">${(remito.monto_total ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-[0.06em] font-semibold text-fg-subtle block mb-1">
                {remito.monto_cobrado > 0 ? 'Pagado (seña y cobros)' : 'Cobrado'}
              </span>
              <span className="text-[18px] font-bold text-fg-brand tabular-nums">${(remito.monto_cobrado ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-[0.06em] font-semibold text-fg-subtle block mb-1">Pendiente</span>
              <span className="text-[18px] font-bold text-warning-soft-fg tabular-nums">${((remito.monto_total ?? 0) - (remito.monto_cobrado ?? 0)).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-end">
              {remito.estado_cobro === 'cobrado' ? (
                <span className="inline-flex items-center px-3 py-1 bg-primary-soft border border-primary-border text-primary-soft-fg text-[11px] font-semibold rounded-[var(--radius-full)]">✓ Cobrado{remito.fecha_cobro ? ` — ${formatDate(remito.fecha_cobro)}` : ''}</span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 bg-warning-soft border border-warning-border text-warning-soft-fg text-[11px] font-semibold rounded-[var(--radius-full)]">Pendiente de cobro</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Datos del remito — pantalla */}
      <div className="print:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
          <div className="px-5 py-3 border-b border-border-subtle">
            <h2 className="text-[11px] uppercase tracking-[0.07em] font-semibold text-fg-subtle">Destinatario</h2>
          </div>
          <div className="px-5 py-4 space-y-1.5">
            <p className="text-[14px] font-semibold text-fg">{remito.destinatario}</p>
            {remito.direccion_entrega && <p className="text-[13px] text-fg-muted">{remito.direccion_entrega}</p>}
            {remito.telefono_entrega  && <p className="text-[13px] text-fg-muted">Tel: {remito.telefono_entrega}</p>}
            {remito.fecha_entrega     && <p className="text-[13px] text-fg-muted">Entrega: {formatDate(remito.fecha_entrega)}</p>}
          </div>
        </div>
        <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
          <div className="px-5 py-3 border-b border-border-subtle">
            <h2 className="text-[11px] uppercase tracking-[0.07em] font-semibold text-fg-subtle">Información del remito</h2>
          </div>
          <div className="px-5 py-4 space-y-1.5">
            {remito.venta_numero && (
              <p className="text-[13px]">
                Venta:{' '}
                <Link href={`/ventas/${remito.venta_numero}`} className="text-fg-brand hover:underline font-medium">
                  #{remito.venta_numero}
                </Link>
              </p>
            )}
            {remito.usuario_nombre && <p className="text-[13px] text-fg-muted">Operador: {remito.usuario_nombre}</p>}
            {remito.observaciones   && (
              <p className="text-[13px] text-fg-muted italic">&ldquo;{remito.observaciones}&rdquo;</p>
            )}
          </div>
        </div>
      </div>

      {/* Items — pantalla */}
      {remito.items.length > 0 && (
        <div className="print:hidden bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
          <div className="px-5 py-3 border-b border-border-subtle">
            <h2 className="text-[11px] uppercase tracking-[0.07em] font-semibold text-fg-subtle">Ítems del remito</h2>
          </div>
          <table className="min-w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-fg-subtle text-left border-b border-border-subtle">
                <th className="px-5 py-2.5 bg-surface-sunken">Producto</th>
                <th className="px-5 py-2.5 bg-surface-sunken text-center">Cantidad</th>
                <th className="px-5 py-2.5 bg-surface-sunken text-right">Precio unit.</th>
                <th className="px-5 py-2.5 bg-surface-sunken text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {remito.items.map((item, i) => (
                <tr key={i} className="hover:bg-surface-sunken transition-colors">
                  <td className="px-5 py-3">
                    <span className="text-[13px] font-medium text-fg">{item.nombre_producto}</span>
                    {(item.talla || item.color) && (
                      <span className="text-[12px] text-fg-subtle ml-1.5">
                        ({[item.talla, item.color].filter(Boolean).join(' / ')})
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-[13px] text-center text-fg tabular-nums">{item.cantidad}</td>
                  <td className="px-5 py-3 text-[13px] text-right text-fg tabular-nums">${Number(item.precio_unitario).toFixed(2)}</td>
                  <td className="px-5 py-3 text-[13px] text-right font-semibold text-fg tabular-nums">${Number(item.total_linea).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border-subtle bg-surface-sunken">
                <td colSpan={3} className="px-5 py-3 text-right text-[13px] font-semibold text-fg-muted">Total</td>
                <td className="px-5 py-3 text-right text-[15px] font-bold text-fg tabular-nums">
                  ${remito.items.reduce((a, i) => a + Number(i.total_linea), 0).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Versión imprimible */}
      <div className="print:block">
        {estiloRemito === 'clasico' ? (
          <RemitoImprimibleClasico
            remito={remito}
            tiendaNombre={tiendaNombre}
            tiendaTelefono={tiendaTelefono}
            tiendaDireccion={tiendaDireccion}
            razonSocial={razonSocial}
            cuit={cuit}
            textoPie={textoPieRemito}
            logoUrl={logoUrl}
            textoEncabezado={textoEncabezado}
          />
        ) : (
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
        )}
      </div>
    </div>
  )
}
