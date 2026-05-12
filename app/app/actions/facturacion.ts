'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { emitirComprobante } from '@/lib/facturacion/tusfacturas'
import {
  determinarTipoComprobante,
  construirRequest,
  formatVencimientoCae,
} from '@/lib/facturacion/comprobante'
import type { FacturacionConfig, CondicionIVAEmisor } from '@/types/database'
import type { FacturacionEstado, FacturaEmitida } from '@/lib/facturacion/tipos'
import type { PayloadTicketVenta } from '@/lib/impresion/types'

export interface ActionResult<T = unknown> {
  ok: boolean
  error?: string
  data?: T
}

// ─── Helpers internos ─────────────────────────────────────────

async function requireCtx() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('No autenticado')
  const { data: perfil, error } = await supabase
    .from('perfiles')
    .select('tienda_id, rol')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (error) throw error
  if (!perfil) throw new Error('Perfil no encontrado')
  return {
    supabase,
    tiendaId: perfil.tienda_id as string,
    userId: auth.user.id,
    rol: perfil.rol as string,
  }
}

function traducirError(msg?: string | null): string {
  if (!msg) return 'Error desconocido'
  if (msg.includes('row-level security')) return 'No tenés permisos para esta operación'
  if (msg.includes('duplicate key')) return 'Ya existe un registro con esos datos'
  return msg
}

// =============================================================
// ESTADO DE FACTURACIÓN — sin exponer credenciales
// =============================================================

/**
 * Devuelve el estado de la facturación electrónica para el tenant actual.
 * Se puede llamar desde el frontend para saber si mostrar el toggle de factura.
 * Las credenciales API NUNCA se incluyen en la respuesta.
 */
export async function obtenerEstadoFacturacion(): Promise<
  ActionResult<FacturacionEstado>
> {
  try {
    const { supabase, tiendaId } = await requireCtx()

    const { data, error } = await supabase
      .from('facturacion_config')
      .select(
        'activo, condicion_iva_emisor, punto_de_venta, ' +
          'api_usertoken, api_apitoken, api_apikey'
      )
      .eq('tienda_id', tiendaId)
      .maybeSingle()

    if (error) return { ok: false, error: traducirError(error.message) }

    if (!data) {
      return {
        ok: true,
        data: {
          activo: false,
          configurado: false,
          condicion_iva_emisor: 'Monotributista',
          punto_de_venta: null,
        },
      }
    }

    const configurado = Boolean(
      data.api_usertoken && data.api_apitoken && data.api_apikey && data.punto_de_venta
    )

    return {
      ok: true,
      data: {
        activo: data.activo && configurado,
        configurado,
        condicion_iva_emisor: data.condicion_iva_emisor as CondicionIVAEmisor,
        punto_de_venta: data.punto_de_venta,
      },
    }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

// =============================================================
// GUARDAR CONFIGURACIÓN — solo owner/admin
// =============================================================

export interface GuardarConfigFacturacionInput {
  condicion_iva_emisor: CondicionIVAEmisor
  punto_de_venta: number
  api_usertoken: string
  api_apitoken: string
  api_apikey: string
  activo: boolean
}

export async function guardarConfigFacturacion(
  input: GuardarConfigFacturacionInput
): Promise<ActionResult<void>> {
  try {
    const { supabase, tiendaId } = await requireCtx()

    // Validación básica
    if (!input.punto_de_venta || input.punto_de_venta < 1) {
      return { ok: false, error: 'El punto de venta debe ser un número mayor a 0' }
    }
    if (!input.api_usertoken.trim() || !input.api_apitoken.trim() || !input.api_apikey.trim()) {
      return { ok: false, error: 'Las tres credenciales de TusFacturasAPP son obligatorias' }
    }

    const { error } = await supabase
      .from('facturacion_config')
      .upsert(
        {
          tienda_id: tiendaId,
          condicion_iva_emisor: input.condicion_iva_emisor,
          punto_de_venta: input.punto_de_venta,
          api_usertoken: input.api_usertoken.trim(),
          api_apitoken: input.api_apitoken.trim(),
          api_apikey: input.api_apikey.trim(),
          activo: input.activo,
        },
        { onConflict: 'tienda_id' }
      )

    if (error) return { ok: false, error: traducirError(error.message) }

    revalidatePath('/configuracion')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

/**
 * Devuelve la configuración de facturación para el formulario de configuración.
 * Las credenciales se enmascaran: solo se indica si están configuradas (boolean).
 */
export async function obtenerConfigFacturacionParaForm(): Promise<
  ActionResult<{
    condicion_iva_emisor: CondicionIVAEmisor
    punto_de_venta: number | null
    activo: boolean
    usertoken_configurado: boolean
    apitoken_configurado: boolean
    apikey_configurado: boolean
  }>
> {
  try {
    const { supabase, tiendaId } = await requireCtx()

    const { data, error } = await supabase
      .from('facturacion_config')
      .select(
        'condicion_iva_emisor, punto_de_venta, activo, ' +
          'api_usertoken, api_apitoken, api_apikey'
      )
      .eq('tienda_id', tiendaId)
      .maybeSingle()

    if (error) return { ok: false, error: traducirError(error.message) }

    if (!data) {
      return {
        ok: true,
        data: {
          condicion_iva_emisor: 'Monotributista',
          punto_de_venta: null,
          activo: false,
          usertoken_configurado: false,
          apitoken_configurado: false,
          apikey_configurado: false,
        },
      }
    }

    return {
      ok: true,
      data: {
        condicion_iva_emisor: data.condicion_iva_emisor as CondicionIVAEmisor,
        punto_de_venta: data.punto_de_venta,
        activo: data.activo,
        usertoken_configurado: Boolean(data.api_usertoken),
        apitoken_configurado: Boolean(data.api_apitoken),
        apikey_configurado: Boolean(data.api_apikey),
      },
    }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

// =============================================================
// EMITIR FACTURA — acción principal
// =============================================================

/**
 * Emite un comprobante electrónico para una venta ya registrada.
 *
 * - Si la venta ya tiene CAE: devuelve error.
 * - Si la facturación no está activa/configurada: devuelve error.
 * - Si AFIP rechaza o la API falla: devuelve error SIN revertir la venta.
 * - Si todo OK: guarda CAE, número de comprobante y QR en la venta.
 */
export async function emitirFactura(
  ventaId: string,
  cuitReceptor?: string | null
): Promise<ActionResult<FacturaEmitida>> {
  try {
    const { supabase, tiendaId } = await requireCtx()

    // 1. Verificar que la venta pertenece al tenant
    const { data: venta, error: vErr } = await supabase
      .from('ventas')
      .select('id, tienda_id, cae, total, estado')
      .eq('id', ventaId)
      .maybeSingle()

    if (vErr) return { ok: false, error: traducirError(vErr.message) }
    if (!venta || venta.tienda_id !== tiendaId) {
      return { ok: false, error: 'Venta no encontrada' }
    }
    if (venta.estado === 'anulada') {
      return { ok: false, error: 'No se puede facturar una venta anulada' }
    }
    if (venta.cae) {
      return { ok: false, error: 'Esta venta ya tiene un comprobante emitido (CAE: ' + venta.cae + ')' }
    }

    // 2. Cargar configuración de facturación (con credenciales, server-side)
    const { data: config, error: cfErr } = await supabase
      .from('facturacion_config')
      .select('*')
      .eq('tienda_id', tiendaId)
      .maybeSingle()

    if (cfErr) return { ok: false, error: traducirError(cfErr.message) }
    if (!config) {
      return { ok: false, error: 'La facturación electrónica no está configurada. Andá a Configuración → Facturación.' }
    }
    if (!config.activo) {
      return { ok: false, error: 'La facturación electrónica está desactivada.' }
    }
    if (!config.api_usertoken || !config.api_apitoken || !config.api_apikey) {
      return { ok: false, error: 'Faltan credenciales de TusFacturasAPP. Revisá la configuración.' }
    }
    if (!config.punto_de_venta) {
      return { ok: false, error: 'No está configurado el Punto de Venta AFIP.' }
    }

    // 3. Obtener payload de la venta
    const { data: payload, error: pErr } = await supabase.rpc(
      'build_payload_ticket_venta',
      { p_venta_id: ventaId }
    )
    if (pErr) return { ok: false, error: traducirError(pErr.message) }
    if (!payload) return { ok: false, error: 'No se pudo obtener los datos de la venta' }

    const ventaPayload = payload as PayloadTicketVenta

    // 4. Determinar tipo de comprobante
    const tipoComprobante = determinarTipoComprobante(
      config.condicion_iva_emisor as CondicionIVAEmisor,
      cuitReceptor
    )

    // 5. Construir y enviar el request a TusFacturasAPP
    const request = construirRequest(
      ventaPayload,
      {
        usertoken: config.api_usertoken,
        apitoken: config.api_apitoken,
        apikey: config.api_apikey,
      },
      config.punto_de_venta,
      tipoComprobante,
      cuitReceptor
    )

    let respuesta
    try {
      respuesta = await emitirComprobante(request)
    } catch (apiErr) {
      return { ok: false, error: (apiErr as Error).message }
    }

    // 6. Guardar resultados en la venta
    // La API devuelve vencimiento_cae en formato 'DD/MM/YYYY' y CAE con espacio al final
    const caeClean = respuesta.cae.trim()
    const qrClean = respuesta.afip_qr?.trim() ?? ''

    // comprobante_nro en producción = '0000001'. En DEV puede venir como '00001-00000001'.
    const rawNro = respuesta.comprobante_nro.trim()
    const numeroComprobante = rawNro.includes('-')
      ? rawNro  // DEV ya incluye el punto de venta formateado
      : `${String(config.punto_de_venta).padStart(5, '0')}-${rawNro.padStart(8, '0')}`

    // Convertir 'DD/MM/YYYY' a 'YYYY-MM-DD' para PostgreSQL date
    let caeVencFecha: string | null = null
    const venc = respuesta.vencimiento_cae?.trim()
    if (venc && venc.includes('/')) {
      const [dd, mm, yyyy] = venc.split('/')
      caeVencFecha = `${yyyy}-${mm}-${dd}`
    } else if (venc && venc.length === 8) {
      // formato 'AAAAMMDD' como fallback
      caeVencFecha = `${venc.slice(0, 4)}-${venc.slice(4, 6)}-${venc.slice(6, 8)}`
    }

    const { error: updErr } = await supabase
      .from('ventas')
      .update({
        tipo_comprobante: tipoComprobante,
        numero_comprobante: numeroComprobante,
        cae: caeClean,
        cae_vencimiento: caeVencFecha,
        qr_afip: qrClean,
        pdf_url: respuesta.comprobante_pdf_url ?? null,
        cuit_receptor: cuitReceptor ?? null,
      })
      .eq('id', ventaId)
      .eq('tienda_id', tiendaId)

    if (updErr) {
      // La factura fue emitida pero no se pudo guardar — loguear y avisar
      console.error('[facturacion] Error guardando CAE en venta:', updErr.message)
      return {
        ok: false,
        error: `La factura fue emitida (CAE: ${caeClean}) pero no se pudo guardar. Anotá el CAE y contactá soporte.`,
      }
    }

    // Formato legible de vencimiento para la respuesta
    const caeVencLegible = caeVencFecha
      ? new Date(caeVencFecha).toLocaleDateString('es-AR')
      : ''

    revalidatePath(`/ventas/${ventaId}`)
    revalidatePath('/ventas')

    return {
      ok: true,
      data: {
        tipo_comprobante: tipoComprobante,
        numero_comprobante: numeroComprobante,
        cae: caeClean,
        cae_vencimiento: caeVencLegible,
        qr_afip: qrClean,
        pdf_url: respuesta.comprobante_pdf_url ?? null,
      },
    }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}
