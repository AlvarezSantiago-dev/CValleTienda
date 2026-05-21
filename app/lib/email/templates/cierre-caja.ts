// Template HTML para el email de cierre de caja.
// Usa inline styles + tablas para máxima compatibilidad con clientes de email.

export interface CierreEmailData {
  tienda_nombre: string
  tienda_logo_url: string | null
  fecha_cierre: string
  tipo_cierre: 'normal' | 'emergencia' | 'automatico'
  total_ventas_monto: number
  total_ventas_cantidad: number
  total_devoluciones_monto: number
  total_devoluciones_cantidad: number
  total_neto: number
  efectivo_declarado: number | null
  diferencia_efectivo: number | null
  detalles: Array<{
    nombre_cuenta: string
    tipo_cuenta: string
    total_ingresos: number
    total_egresos: number
    total_neto: number
  }>
  top_productos: Array<{
    nombre: string
    cantidad: number
    subtotal: number
  }>
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function ars(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

function fechaLegible(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

export function buildCierreEmailHtml(data: CierreEmailData): string {
  const {
    tienda_nombre,
    tienda_logo_url,
    fecha_cierre,
    tipo_cierre,
    total_ventas_monto,
    total_ventas_cantidad,
    total_devoluciones_monto,
    total_devoluciones_cantidad,
    total_neto,
    efectivo_declarado,
    diferencia_efectivo,
    detalles,
    top_productos,
  } = data

  // ── Colores de diferencia de efectivo ──────────────────────
  let difBg = '#f9fafb'
  let difColor = '#111827'
  let difLabel = '—'
  if (diferencia_efectivo !== null) {
    difLabel = ars(diferencia_efectivo)
    if (diferencia_efectivo < 0) {
      difBg = '#fef2f2'
      difColor = '#dc2626'
    } else if (diferencia_efectivo > 0) {
      difBg = '#fefce8'
      difColor = '#ca8a04'
    } else {
      difBg = '#f0fdf4'
      difColor = '#16a34a'
    }
  }

  // ── Banner de emergencia ────────────────────────────────────
  const emergencyBanner =
    tipo_cierre === 'emergencia'
      ? `<div style="background:#fff7ed;border-left:4px solid #ea580c;padding:16px 40px;font-size:13px;color:#9a3412;">
          <strong>⚠ Cierre de emergencia</strong> — Este turno se cerró sin arqueo de efectivo.
        </div>`
      : tipo_cierre === 'automatico'
      ? `<div style="background:#fef9c3;border-left:4px solid #ca8a04;padding:16px 40px;font-size:13px;color:#713f12;">
          <strong>⚙ Cierre automático</strong> — La caja fue cerrada automáticamente por el sistema.
        </div>`
      : ''

  // ── Logo o inicial ──────────────────────────────────────────
  const logoHtml = tienda_logo_url
    ? `<img src="${esc(tienda_logo_url)}" alt="${esc(tienda_nombre)}" style="height:40px;margin-bottom:12px;border-radius:6px;" /><br/>`
    : ''

  // ── Métricas 2×2 (tabla para compatibilidad email) ─────────
  const metricasHtml = `
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:8px;margin-bottom:24px;">
      <tr>
        <td width="50%" style="background:#f9fafb;border-radius:10px;padding:16px;vertical-align:top;">
          <div style="color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Ventas</div>
          <div style="color:#111827;font-size:24px;font-weight:800;line-height:1;">${total_ventas_cantidad}</div>
          <div style="color:#6b7280;font-size:13px;margin-top:4px;">${ars(total_ventas_monto)}</div>
        </td>
        <td width="50%" style="background:#f9fafb;border-radius:10px;padding:16px;vertical-align:top;">
          <div style="color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Devoluciones</div>
          <div style="color:#111827;font-size:24px;font-weight:800;line-height:1;">${total_devoluciones_cantidad}</div>
          <div style="color:#6b7280;font-size:13px;margin-top:4px;">${ars(total_devoluciones_monto)}</div>
        </td>
      </tr>
      <tr>
        <td width="50%" style="background:#f9fafb;border-radius:10px;padding:16px;vertical-align:top;">
          <div style="color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Efectivo declarado</div>
          <div style="color:#111827;font-size:24px;font-weight:800;line-height:1;">${efectivo_declarado !== null ? ars(efectivo_declarado) : '—'}</div>
        </td>
        <td width="50%" style="background:${difBg};border-radius:10px;padding:16px;vertical-align:top;">
          <div style="color:#6b7280;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">Diferencia de caja</div>
          <div style="color:${difColor};font-size:24px;font-weight:800;line-height:1;">${difLabel}</div>
        </td>
      </tr>
    </table>`

  // ── Desglose por cuenta ─────────────────────────────────────
  const cuentasHtml =
    detalles.length > 0
      ? `<div style="margin-bottom:28px;">
          <div style="font-size:13px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:12px;">Desglose por cuenta</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:10px 12px;text-align:left;font-weight:600;color:#6b7280;border-radius:6px 0 0 6px;">Cuenta</th>
                <th style="padding:10px 12px;text-align:right;font-weight:600;color:#6b7280;">Ingresos</th>
                <th style="padding:10px 12px;text-align:right;font-weight:600;color:#6b7280;">Egresos</th>
                <th style="padding:10px 12px;text-align:right;font-weight:600;color:#6b7280;border-radius:0 6px 6px 0;">Neto</th>
              </tr>
            </thead>
            <tbody>
              ${detalles
                .map(
                  (d, i) =>
                    `<tr style="border-bottom:1px solid #f3f4f6;background:${i % 2 === 0 ? '#ffffff' : '#fafafa'}">
                      <td style="padding:10px 12px;color:#374151;font-weight:500;">${esc(d.nombre_cuenta)}</td>
                      <td style="padding:10px 12px;text-align:right;color:#16a34a;">${ars(d.total_ingresos)}</td>
                      <td style="padding:10px 12px;text-align:right;color:#dc2626;">${ars(d.total_egresos)}</td>
                      <td style="padding:10px 12px;text-align:right;font-weight:700;color:${d.total_neto >= 0 ? '#15803d' : '#dc2626'};">${ars(d.total_neto)}</td>
                    </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>`
      : ''

  // ── Top productos ───────────────────────────────────────────
  const productosHtml =
    top_productos.length > 0
      ? `<div style="margin-bottom:28px;">
          <div style="font-size:13px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:12px;">Top productos del turno</div>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:10px 12px;text-align:left;font-weight:600;color:#6b7280;border-radius:6px 0 0 6px;">Producto</th>
                <th style="padding:10px 12px;text-align:right;font-weight:600;color:#6b7280;">Cant.</th>
                <th style="padding:10px 12px;text-align:right;font-weight:600;color:#6b7280;border-radius:0 6px 6px 0;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${top_productos
                .map(
                  (p, i) =>
                    `<tr style="border-bottom:1px solid #f3f4f6;background:${i % 2 === 0 ? '#ffffff' : '#fafafa'}">
                      <td style="padding:10px 12px;color:#374151;">${esc(p.nombre)}</td>
                      <td style="padding:10px 12px;text-align:right;color:#374151;font-weight:600;">${p.cantidad}</td>
                      <td style="padding:10px 12px;text-align:right;color:#374151;">${ars(p.subtotal)}</td>
                    </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>`
      : ''

  // ── Tipo de cierre badge ────────────────────────────────────
  const tipoBadgeColor =
    tipo_cierre === 'normal' ? '#16a34a' : tipo_cierre === 'emergencia' ? '#ea580c' : '#ca8a04'
  const tipoLabel =
    tipo_cierre === 'normal' ? 'Cierre normal' : tipo_cierre === 'emergencia' ? 'Cierre de emergencia' : 'Cierre automático'

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cierre de Caja — ${esc(tienda_nombre)}</title>
</head>
<body style="margin:0;padding:24px 0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
    <tr><td>

      <!-- Tarjeta principal -->
      <div style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <div style="background:#0a0a0a;padding:32px 40px;">
          ${logoHtml}
          <div style="font-size:22px;font-weight:800;color:#ffffff;margin:0 0 4px 0;">${esc(tienda_nombre)}</div>
          <div style="font-size:13px;color:#a1a1aa;margin:0 0 12px 0;">${fechaLegible(fecha_cierre)}</div>
          <span style="display:inline-block;background:${tipoBadgeColor};color:#ffffff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;letter-spacing:0.04em;">${tipoLabel}</span>
        </div>

        ${emergencyBanner}

        <!-- Cuerpo -->
        <div style="padding:32px 40px;">

          <!-- Total neto destacado -->
          <div style="background:#f0fdf4;border:2px solid #84cc16;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
            <div style="color:#166534;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Total Neto del Turno</div>
            <div style="color:#15803d;font-size:40px;font-weight:900;line-height:1;">${ars(total_neto)}</div>
            <div style="color:#4ade80;font-size:12px;margin-top:8px;">Ventas ${ars(total_ventas_monto)} &minus; Devoluciones ${ars(total_devoluciones_monto)}</div>
          </div>

          <!-- Métricas 2×2 -->
          ${metricasHtml}

          <!-- Desglose por cuenta -->
          ${cuentasHtml}

          <!-- Top productos -->
          ${productosHtml}

        </div>

        <!-- Footer -->
        <div style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
          <div style="font-size:12px;color:#9ca3af;">
            Enviado por <strong style="color:#374151;">CValleTienda</strong> · Sistema de gestión para comercios
          </div>
        </div>

      </div>

    </td></tr>
  </table>
</body>
</html>`
}
