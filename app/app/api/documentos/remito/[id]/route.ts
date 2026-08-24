import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { obtenerRemito } from '@/lib/remitos/queries'
import { obtenerConfiguracionTienda } from '@/lib/configuracion/queries'
import { getContextoTienda } from '@/lib/supabase/context'
import { formatDate } from '@/lib/format'
import { escHtml, formatMoneyDoc, wrapDocHtml } from '@/lib/documentos/html'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(_request: Request, { params }: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params
  const remito = await obtenerRemito(id)
  if (!remito) {
    return NextResponse.json({ error: 'Remito no encontrado' }, { status: 404 })
  }

  const [ctx, config] = await Promise.all([getContextoTienda(), obtenerConfiguracionTienda()])
  const { data: tiendaData } = await supabase
    .from('tiendas')
    .select('nombre, telefono, direccion')
    .eq('id', ctx?.tiendaId ?? '')
    .maybeSingle()
  const t = tiendaData as { nombre: string; telefono: string | null; direccion: string | null } | null

  const tiendaNombre = t?.nombre ?? ctx?.nombre ?? 'Mi Tienda'
  const razonSocial = (config as { razon_social?: string | null } | null)?.razon_social ?? null
  const cuit = (config as { cuit?: string | null } | null)?.cuit ?? null
  const direccionLegal =
    (config as { direccion_legal?: string | null } | null)?.direccion_legal ?? t?.direccion ?? null
  const textoPie =
    (config as { texto_pie_remito?: string | null } | null)?.texto_pie_remito ??
    (config as { texto_pie?: string | null } | null)?.texto_pie ??
    null
  const num = String(remito.numero_remito).padStart(4, '0')
  const tipoLabel = remito.tipo === 'cuenta_corriente' ? 'Cuenta corriente' : 'Entrega'

  const filas =
    remito.items.length > 0
      ? remito.items
          .map((item, i) => {
            const bg = i % 2 === 0 ? '#fff' : '#f9fafb'
            const varTxt = [item.talla, item.color].filter(Boolean).join(' / ')
            return `<tr style="background:${bg}">
              <td>
                <div class="strong">${escHtml(item.nombre_producto)}</div>
                ${varTxt ? `<div class="muted" style="font-size:11px">${escHtml(varTxt)}</div>` : ''}
              </td>
              <td class="center">${item.cantidad}</td>
              <td class="right">${formatMoneyDoc(Number(item.precio_unitario))}</td>
              <td class="right strong">${formatMoneyDoc(Number(item.total_linea))}</td>
            </tr>`
          })
          .join('')
      : `<tr><td colspan="4" class="muted">Sin ítems detallados</td></tr>`

  const totalItems = remito.items.reduce((a, i) => a + Number(i.total_linea), 0)
  const totalMostrar = remito.monto_total > 0 ? remito.monto_total : totalItems

  const body = `
  <header style="display:flex;justify-content:space-between;gap:16px;padding-bottom:14px;border-bottom:2px solid #111827;margin-bottom:18px">
    <div>
      <div style="font-size:20px;font-weight:800;letter-spacing:-0.02em">${escHtml(tiendaNombre)}</div>
      ${razonSocial ? `<div class="muted" style="margin-top:2px">${escHtml(razonSocial)}</div>` : ''}
      ${cuit ? `<div class="muted">CUIT ${escHtml(cuit)}</div>` : ''}
      ${direccionLegal ? `<div class="muted">${escHtml(direccionLegal)}</div>` : ''}
      ${t?.telefono ? `<div class="muted">Tel: ${escHtml(t.telefono)}</div>` : ''}
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;font-weight:700">Remito</div>
      <div style="font-size:28px;font-weight:800">#${escHtml(num)}</div>
      <div class="muted" style="margin-top:4px">${escHtml(formatDate(remito.created_at))}</div>
      <div class="muted">${escHtml(tipoLabel)}</div>
    </div>
  </header>

  <section style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
    <div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;font-weight:700;margin-bottom:6px">Destinatario</div>
      <div class="strong">${escHtml(remito.destinatario)}</div>
      ${remito.direccion_entrega ? `<div class="muted">${escHtml(remito.direccion_entrega)}</div>` : ''}
      ${remito.telefono_entrega ? `<div class="muted">Tel: ${escHtml(remito.telefono_entrega)}</div>` : ''}
      ${remito.fecha_entrega ? `<div class="muted">Entrega: ${escHtml(formatDate(remito.fecha_entrega))}</div>` : ''}
    </div>
    <div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;font-weight:700;margin-bottom:6px">Información</div>
      ${remito.venta_numero ? `<div class="muted">Venta #${remito.venta_numero}</div>` : ''}
      ${remito.usuario_nombre ? `<div class="muted">Operador: ${escHtml(remito.usuario_nombre)}</div>` : ''}
      ${remito.observaciones ? `<div class="muted" style="font-style:italic">“${escHtml(remito.observaciones)}”</div>` : ''}
    </div>
  </section>

  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th class="center" style="width:70px">Cant.</th>
        <th class="right" style="width:100px">P. unit.</th>
        <th class="right" style="width:110px">Subtotal</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
    <tfoot>
      <tr>
        <td colspan="3" class="right strong" style="border-bottom:none;padding-top:12px">Total</td>
        <td class="right strong" style="border-bottom:none;padding-top:12px;font-size:16px">${formatMoneyDoc(totalMostrar)}</td>
      </tr>
    </tfoot>
  </table>

  ${textoPie ? `<p class="muted" style="margin-top:24px;font-size:11px;text-align:center">${escHtml(textoPie)}</p>` : ''}
  `

  const html = wrapDocHtml({
    title: `Remito #${num} — ${tiendaNombre}`,
    body,
    pageSize: 'A4',
  })

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
