import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listarProductos, type ProductoListItem } from '@/lib/productos/queries'
import { obtenerConfiguracionTienda } from '@/lib/configuracion/queries'
import { getContextoTienda } from '@/lib/supabase/context'

function formatARS(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-AR')
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const categoriaId   = searchParams.get('categoria') ?? undefined
  const mostrarCosto  = searchParams.get('mostrar_costo') === '1'

  // Traer todos los productos sin paginación
  const [{ items }, config, ctx] = await Promise.all([
    listarProductos({ categoriaId, pageSize: 9999 }),
    obtenerConfiguracionTienda(),
    getContextoTienda(),
  ])

  const tiendaNombre = ctx?.nombre ?? 'Mi Tienda'
  const logoUrl      = config?.logo_url ?? null
  const fechaHoy     = formatDate(new Date())

  // Agrupar por categoría
  const grupos = new Map<string, ProductoListItem[]>()
  for (const p of items) {
    const key = p.categoria?.nombre ?? 'Sin categoría'
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key)!.push(p)
  }

  // Ordenar grupos alfabéticamente
  const gruposOrdenados = [...grupos.entries()].sort(([a], [b]) =>
    a.localeCompare(b, 'es', { sensitivity: 'base' })
  )

  // Generar filas de tabla por grupo
  function renderGrupo(nombre: string, productos: ProductoListItem[]): string {
    const filas = productos.map((p, i) => {
      const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb'
      const stockBajo = p.stock_total === 0
      const stockStyle = stockBajo
        ? 'background:#fef2f2;color:#dc2626;font-weight:600'
        : 'color:#111827'

      return `
        <tr style="background:${bg};border-bottom:1px solid #e5e7eb">
          <td style="padding:6px 8px;font-size:11px;color:#374151">${p.codigo_base ?? '—'}</td>
          <td style="padding:6px 8px;font-size:11px;font-weight:500;color:#111827">${escHtml(p.nombre)}</td>
          ${mostrarCosto ? `<td style="padding:6px 8px;font-size:11px;color:#6b7280;text-align:right">${p.precio_compra > 0 ? formatARS(p.precio_compra) : '—'}</td>` : ''}
          <td style="padding:6px 8px;font-size:11px;font-weight:600;color:#0A0A0A;text-align:right">${formatARS(p.precio_venta)}</td>
          <td style="padding:6px 8px;font-size:11px;text-align:center;${stockStyle}">${p.stock_total}</td>
          <td style="padding:6px 8px;font-size:11px;text-align:center;color:#9ca3af">${p.variantes_count > 1 ? p.variantes_count : '—'}</td>
        </tr>`
    }).join('')

    const thStyle = 'padding:6px 8px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;border-bottom:2px solid #e5e7eb;text-align:left'
    const thRight = thStyle + ';text-align:right'
    const thCenter = thStyle + ';text-align:center'

    return `
      <div style="margin-bottom:24px;page-break-inside:avoid">
        <div style="background:#0A0A0A;color:#ffffff;padding:8px 12px;border-radius:6px 6px 0 0;display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:12px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase">${escHtml(nombre)}</span>
          <span style="font-size:11px;opacity:0.6">${productos.length} producto${productos.length !== 1 ? 's' : ''}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-top:none">
          <thead style="background:#f9fafb">
            <tr>
              <th style="${thStyle};width:80px">Cód. base</th>
              <th style="${thStyle}">Nombre</th>
              ${mostrarCosto ? `<th style="${thRight};width:90px">P. Compra</th>` : ''}
              <th style="${thRight};width:90px">P. Venta</th>
              <th style="${thCenter};width:60px">Stock</th>
              <th style="${thCenter};width:60px">Vars.</th>
            </tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </div>`
  }

  const cuerpo = gruposOrdenados.map(([nombre, productos]) => renderGrupo(nombre, productos)).join('')

  const logoHtml = logoUrl
    ? `<img src="${escHtml(logoUrl)}" alt="Logo" style="height:48px;width:auto;object-fit:contain;margin-right:16px" />`
    : `<div style="width:48px;height:48px;background:#0A0A0A;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-right:16px">
         <span style="color:#fff;font-size:18px;font-weight:800">${escHtml(tiendaNombre.charAt(0))}</span>
       </div>`

  const totalProductos = items.length

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Lista de Productos — ${escHtml(tiendaNombre)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      font-size: 12px;
      color: #111827;
      background: #fff;
      padding: 24px 28px;
      max-width: 900px;
      margin: 0 auto;
    }
    @media print {
      body { padding: 8mm 10mm; max-width: 100%; }
      @page { size: A4; margin: 12mm 10mm; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>

  <!-- Header -->
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #0A0A0A">
    <div style="display:flex;align-items:center">
      ${logoHtml}
      <div>
        <div style="font-size:18px;font-weight:800;color:#0A0A0A;letter-spacing:-0.02em">${escHtml(tiendaNombre)}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px">Lista de Productos</div>
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:#6b7280">Generado el</div>
      <div style="font-size:13px;font-weight:600;color:#0A0A0A">${fechaHoy}</div>
      <div style="font-size:10px;color:#9ca3af;margin-top:2px">${totalProductos} productos en total</div>
    </div>
  </div>

  <!-- Leyenda stock -->
  <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;font-size:10px;color:#6b7280" class="no-print">
    <span>Imprimí con Ctrl+P → Guardar como PDF para exportar</span>
  </div>
  <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;font-size:10px;color:#6b7280">
    <span style="display:inline-flex;align-items:center;gap:4px"><span style="display:inline-block;width:10px;height:10px;background:#fef2f2;border:1px solid #fca5a5;border-radius:2px"></span> Stock 0</span>
    ${mostrarCosto ? '<span style="color:#9ca3af">• P.C. = Precio de compra</span>' : ''}
  </div>

  <!-- Grupos por categoría -->
  ${cuerpo}

  <!-- Footer -->
  <div style="margin-top:24px;padding-top:12px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af">
    <span>${escHtml(tiendaNombre)}</span>
    <span>${fechaHoy}</span>
  </div>

  <script>
    window.addEventListener('load', () => setTimeout(() => window.print(), 300))
  </script>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
