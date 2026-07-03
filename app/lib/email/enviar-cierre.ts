// Orquesta los datos del cierre y envía el email al dueño de la tienda.
// Se llama desde cerrarSesion() / cerrarSesionEmergencia() en actions/caja.ts.
// Es awaitable pero NUNCA lanza — los errores se loguean y se ignoran.

import { createClient } from '@/lib/supabase/server'
import { obtenerCierre } from '@/lib/caja/queries'
import { resend } from '@/lib/email/resend'
import { buildCierreEmailHtml, type CierreEmailData } from '@/lib/email/templates/cierre-caja'

export async function enviarEmailCierre(
  sesionId: string,
  cierreId: string,
  tiendaId: string
): Promise<void> {
  try {
    if (!resend) return // RESEND_API_KEY no configurada

    // ── 1. Email destino ──────────────────────────────────────
    const supabase = await createClient()
    const { data: tienda } = await supabase
      .from('tiendas')
      .select('nombre, email, logo_url')
      .eq('id', tiendaId)
      .maybeSingle()

    if (!tienda?.email) {
      // Sin email configurado → skip silencioso
      console.info('[email] tienda sin email configurado, omitiendo envío de cierre')
      return
    }

    // ── 2. Datos del cierre ───────────────────────────────────
    const cierre = await obtenerCierre(sesionId)
    if (!cierre) {
      console.warn('[email] cierre no encontrado para sesion', sesionId)
      return
    }

    // ── 3. Top 5 productos del turno ──────────────────────────
    const { data: itemsRaw } = await supabase
      .from('detalles_venta')
      .select('nombre_producto, cantidad, total_linea, venta:ventas!inner(sesion_caja_id, estado)')
      .eq('tienda_id', tiendaId)
      .eq('venta.sesion_caja_id', sesionId)
      .eq('venta.estado', 'completada')

    // Agrupar por nombre_producto
    const agrupado = new Map<string, { cantidad: number; subtotal: number }>()
    for (const item of (itemsRaw ?? []) as Array<{
      nombre_producto: string
      cantidad: number
      total_linea: number | string
    }>) {
      const curr = agrupado.get(item.nombre_producto) ?? { cantidad: 0, subtotal: 0 }
      curr.cantidad += Number(item.cantidad)
      curr.subtotal += Number(item.total_linea)
      agrupado.set(item.nombre_producto, curr)
    }

    const top_productos = Array.from(agrupado.entries())
      .sort((a, b) => b[1].cantidad - a[1].cantidad)
      .slice(0, 5)
      .map(([nombre, v]) => ({ nombre, cantidad: v.cantidad, subtotal: v.subtotal }))

    // ── 4. Armar datos del email ──────────────────────────────
    const emailData: CierreEmailData = {
      tienda_nombre: (tienda as { nombre: string; email: string; logo_url: string | null }).nombre,
      tienda_logo_url: (tienda as { nombre: string; email: string; logo_url: string | null }).logo_url ?? null,
      fecha_cierre: cierre.fecha_cierre,
      tipo_cierre: cierre.tipo_cierre,
      total_ventas_monto: cierre.total_ventas_monto,
      total_ventas_cantidad: cierre.total_ventas_cantidad,
      total_devoluciones_monto: cierre.total_devoluciones_monto,
      total_devoluciones_cantidad: cierre.total_devoluciones_cantidad,
      total_devoluciones_reintegro: cierre.total_devoluciones_reintegro,
      total_devoluciones_credito: cierre.total_devoluciones_credito,
      total_neto: cierre.total_neto,
      efectivo_declarado: cierre.efectivo_declarado,
      diferencia_efectivo: cierre.diferencia_efectivo,
      detalles: cierre.detalles.map((d) => ({
        nombre_cuenta: d.nombre_cuenta,
        tipo_cuenta: d.tipo_cuenta,
        total_ingresos: d.total_ingresos,
        total_egresos: d.total_egresos,
        total_neto: d.total_neto,
      })),
      top_productos,
    }

    // ── 5. Construir y enviar ─────────────────────────────────
    const html = buildCierreEmailHtml(emailData)

    const fechaLabel = new Date(cierre.fecha_cierre).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'America/Argentina/Buenos_Aires',
    })

    const from = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
    const to = (tienda as { nombre: string; email: string; logo_url: string | null }).email

    const { error } = await resend.emails.send({
      from,
      to,
      subject: `Cierre de caja — ${emailData.tienda_nombre} — ${fechaLabel}`,
      html,
    })

    if (error) {
      console.error('[email] Resend rechazó el envío:', error)
    } else {
      console.info(`[email] Email de cierre enviado a ${to}`)
    }
  } catch (err) {
    // Nunca propagar — el cierre ya se realizó y no debe revertirse
    console.error('[email] Error inesperado al enviar email de cierre:', err)
  }
}
