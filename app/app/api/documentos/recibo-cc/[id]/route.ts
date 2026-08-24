import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { obtenerPayloadReciboCc } from '@/app/actions/recibo-cc'
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
  const res = await obtenerPayloadReciboCc(id)
  if (!res.ok || !res.data) {
    return NextResponse.json({ error: res.error ?? 'Recibo no encontrado' }, { status: 404 })
  }

  const p = res.data
  const sim = p.tienda.simbolo_moneda || '$'
  const money = (n: number) => formatMoneyDoc(n, sim)

  const body = `
  <header style="padding-bottom:14px;border-bottom:2px solid #111827;margin-bottom:18px;text-align:center">
    <div style="font-size:20px;font-weight:800">${escHtml(p.tienda.nombre)}</div>
    ${p.tienda.razon_social ? `<div class="muted">${escHtml(p.tienda.razon_social)}</div>` : ''}
    ${p.tienda.cuit ? `<div class="muted">CUIT ${escHtml(p.tienda.cuit)}</div>` : ''}
    ${(p.tienda.direccion_legal || p.tienda.direccion) ? `<div class="muted">${escHtml(p.tienda.direccion_legal || p.tienda.direccion)}</div>` : ''}
    ${p.tienda.texto_encabezado ? `<div class="muted" style="margin-top:6px">${escHtml(p.tienda.texto_encabezado)}</div>` : ''}
  </header>

  <div style="text-align:center;margin-bottom:20px">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;font-weight:700">Recibo de cobro</div>
    <div style="font-size:28px;font-weight:800;margin-top:4px">${money(p.monto)}</div>
    <div class="muted" style="margin-top:4px">${escHtml(p.fecha)}</div>
  </div>

  <section style="max-width:420px;margin:0 auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
    <div style="display:flex;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #e5e7eb">
      <span class="muted">Cliente</span><span class="strong">${escHtml(p.clienteNombre)}</span>
    </div>
    ${
      p.medioPago
        ? `<div style="display:flex;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #e5e7eb">
             <span class="muted">Medio de pago</span><span class="strong">${escHtml(p.medioPago)}</span>
           </div>`
        : ''
    }
    ${
      p.remitoNumero != null
        ? `<div style="display:flex;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #e5e7eb">
             <span class="muted">Remito</span><span class="strong">#${String(p.remitoNumero).padStart(4, '0')}</span>
           </div>`
        : ''
    }
    ${
      p.concepto
        ? `<div style="padding:12px 14px;border-bottom:1px solid #e5e7eb">
             <div class="muted" style="margin-bottom:4px">Concepto</div>
             <div>${escHtml(p.concepto)}</div>
           </div>`
        : ''
    }
    <div style="display:flex;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #e5e7eb">
      <span class="muted">Saldo anterior</span><span>${money(p.saldoAnterior)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:12px 14px;background:#f9fafb">
      <span class="strong">Saldo posterior</span><span class="strong">${money(p.saldoPosterior)}</span>
    </div>
  </section>

  ${p.tienda.texto_pie ? `<p class="muted" style="margin-top:24px;font-size:11px;text-align:center">${escHtml(p.tienda.texto_pie)}</p>` : ''}
  `

  const html = wrapDocHtml({
    title: `Recibo CC — ${p.clienteNombre}`,
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
