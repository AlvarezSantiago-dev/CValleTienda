import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { obtenerPayloadVenta } from '@/app/actions/impresion'
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
  const res = await obtenerPayloadVenta(id)
  if (!res.ok || !res.data) {
    return NextResponse.json({ error: res.error ?? 'Venta no encontrada' }, { status: 404 })
  }

  const p = res.data
  const sim = p.tienda.simbolo_moneda || '$'
  const money = (n: number) => formatMoneyDoc(n, sim)

  const filas = p.lineas
    .map((l, i) => {
      const bg = i % 2 === 0 ? '#fff' : '#f9fafb'
      const varTxt = [l.talla, l.color].filter(Boolean).join(' / ')
      return `<tr style="background:${bg}">
        <td>
          <div class="strong">${escHtml(l.nombre_producto)}</div>
          ${varTxt ? `<div class="muted" style="font-size:11px">${escHtml(varTxt)}</div>` : ''}
          ${l.codigo_barras ? `<div class="muted" style="font-size:10px">${escHtml(l.codigo_barras)}</div>` : ''}
        </td>
        <td class="center">${l.cantidad}</td>
        <td class="right">${money(l.precio_unitario)}</td>
        <td class="right strong">${money(l.total_linea)}</td>
      </tr>`
    })
    .join('')

  const pagos = p.pagos
    .map(
      (pago) =>
        `<div style="display:flex;justify-content:space-between;gap:12px;margin-top:4px">
          <span class="muted">${escHtml(pago.nombre_metodo)}</span>
          <span class="strong">${money(pago.monto)}</span>
        </div>`
    )
    .join('')

  const cliente = p.cliente
    ? `<div class="muted" style="margin-top:8px">Cliente: <span class="strong">${escHtml(p.cliente.nombre)}</span>
         ${p.cliente.dni ? ` · DNI ${escHtml(p.cliente.dni)}` : ''}</div>`
    : ''

  const factura = p.factura
    ? `<section style="margin-top:20px;padding:12px;border:1px solid #e5e7eb;border-radius:8px">
         <div class="strong">Factura ${escHtml(p.factura.tipo_comprobante)} ${escHtml(p.factura.numero_comprobante)}</div>
         <div class="muted">CAE ${escHtml(p.factura.cae)} · Vto ${escHtml(p.factura.cae_vencimiento)}</div>
       </section>`
    : ''

  const body = `
  <header style="padding-bottom:14px;border-bottom:2px solid #111827;margin-bottom:18px">
    <div style="font-size:20px;font-weight:800">${escHtml(p.tienda.nombre)}</div>
    ${p.tienda.razon_social ? `<div class="muted">${escHtml(p.tienda.razon_social)}</div>` : ''}
    ${p.tienda.cuit ? `<div class="muted">CUIT ${escHtml(p.tienda.cuit)}</div>` : ''}
    ${(p.tienda.direccion_legal || p.tienda.direccion) ? `<div class="muted">${escHtml(p.tienda.direccion_legal || p.tienda.direccion)}</div>` : ''}
    ${p.tienda.texto_encabezado ? `<div class="muted" style="margin-top:6px">${escHtml(p.tienda.texto_encabezado)}</div>` : ''}
  </header>

  <div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap">
    <div>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;font-weight:700">Comprobante</div>
      <div style="font-size:24px;font-weight:800">Ticket #${escHtml(p.numero_ticket)}</div>
      ${cliente}
    </div>
    <div style="text-align:right">
      <div class="muted">${escHtml(p.fecha)}</div>
      ${p.vendedor ? `<div class="muted">Vendedor: ${escHtml(p.vendedor)}</div>` : ''}
      <div class="muted">Estado: ${escHtml(p.estado)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th class="center" style="width:60px">Cant.</th>
        <th class="right" style="width:90px">P. unit.</th>
        <th class="right" style="width:100px">Total</th>
      </tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>

  <section style="margin-top:16px;max-width:280px;margin-left:auto">
    <div style="display:flex;justify-content:space-between;gap:12px"><span class="muted">Subtotal</span><span>${money(p.subtotal)}</span></div>
    ${p.descuento > 0 ? `<div style="display:flex;justify-content:space-between;gap:12px;margin-top:4px"><span class="muted">Descuento</span><span>-${money(p.descuento)}</span></div>` : ''}
    <div style="display:flex;justify-content:space-between;gap:12px;margin-top:8px;padding-top:8px;border-top:2px solid #111827">
      <span class="strong">Total</span><span class="strong" style="font-size:18px">${money(p.total)}</span>
    </div>
    ${pagos}
    ${
      p.ajuste_redondeo && p.ajuste_redondeo > 0.01
        ? `<div class="muted" style="margin-top:8px;font-size:11px">Ajuste redondeo: ${money(p.ajuste_redondeo)}</div>`
        : ''
    }
  </section>

  ${p.observaciones ? `<p class="muted" style="margin-top:16px;font-style:italic">${escHtml(p.observaciones)}</p>` : ''}
  ${factura}
  ${p.tienda.texto_pie ? `<p class="muted" style="margin-top:24px;font-size:11px;text-align:center">${escHtml(p.tienda.texto_pie)}</p>` : ''}
  `

  const html = wrapDocHtml({
    title: `Ticket #${p.numero_ticket} — ${p.tienda.nombre}`,
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
