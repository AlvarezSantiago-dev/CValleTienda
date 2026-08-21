'use server'

import { createClient } from '@/lib/supabase/server'
import type { PayloadReciboCc } from '@/lib/impresion/recibo-cc'
import { formatFechaRecibo } from '@/lib/impresion/recibo-cc'

export interface ActionResult<T = unknown> {
  ok: boolean
  error?: string
  data?: T
}

export async function obtenerPayloadReciboCc(
  movimientoId: string
): Promise<ActionResult<PayloadReciboCc>> {
  try {
    if (!movimientoId) return { ok: false, error: 'Falta el movimiento' }
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return { ok: false, error: 'No autenticado' }
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('tienda_id')
      .eq('id', auth.user.id)
      .maybeSingle()
    if (!perfil) return { ok: false, error: 'Perfil no encontrado' }
    const tiendaId = perfil.tienda_id as string

    const { data: mov } = await supabase
      .from('movimientos_cc')
      .select(
        'id, tipo, monto, saldo_anterior, saldo_posterior, concepto, medio_pago, remito_id, created_at, cliente_id'
      )
      .eq('id', movimientoId)
      .eq('tienda_id', tiendaId)
      .maybeSingle()
    if (!mov) return { ok: false, error: 'Movimiento no encontrado' }
    const m = mov as {
      tipo: string
      monto: number
      saldo_anterior: number
      saldo_posterior: number
      concepto: string | null
      medio_pago: string | null
      remito_id: string | null
      created_at: string
      cliente_id: string
    }
    if (m.tipo !== 'pago') return { ok: false, error: 'Solo se imprime recibo de cobros' }

    const { data: cli } = await supabase
      .from('clientes')
      .select('nombre, apellido')
      .eq('id', m.cliente_id)
      .eq('tienda_id', tiendaId)
      .maybeSingle()
    const c = cli as { nombre: string; apellido: string | null } | null
    const clienteNombre = c
      ? `${c.nombre}${c.apellido ? ` ${c.apellido}` : ''}`.trim()
      : 'Cliente'

    let remitoNumero: number | null = null
    if (m.remito_id) {
      const { data: rem } = await supabase
        .from('remitos')
        .select('numero_remito')
        .eq('id', m.remito_id)
        .maybeSingle()
      remitoNumero = (rem as { numero_remito: number } | null)?.numero_remito ?? null
    }

    const { data: cfg } = await supabase
      .from('configuracion_tienda')
      .select(
        'razon_social, cuit, condicion_iva, direccion_legal, texto_encabezado, texto_pie, mostrar_logo, ancho_ticket_mm, simbolo_moneda'
      )
      .eq('tienda_id', tiendaId)
      .maybeSingle()
    const { data: tienda } = await supabase
      .from('tiendas')
      .select('nombre, direccion, telefono, logo_url')
      .eq('id', tiendaId)
      .maybeSingle()

    const conf = cfg as {
      razon_social: string | null
      cuit: string | null
      condicion_iva: string | null
      direccion_legal: string | null
      texto_encabezado: string | null
      texto_pie: string | null
      mostrar_logo: boolean
      ancho_ticket_mm: number
      simbolo_moneda: string
    } | null
    const tnd = tienda as {
      nombre: string
      direccion: string | null
      telefono: string | null
      logo_url: string | null
    } | null

    return {
      ok: true,
      data: {
        tienda: {
          nombre: tnd?.nombre ?? 'Comercio',
          razon_social: conf?.razon_social ?? null,
          cuit: conf?.cuit ?? null,
          condicion_iva: conf?.condicion_iva ?? null,
          direccion: tnd?.direccion ?? null,
          direccion_legal: conf?.direccion_legal ?? null,
          telefono: tnd?.telefono ?? null,
          texto_encabezado: conf?.texto_encabezado ?? null,
          texto_pie: conf?.texto_pie ?? null,
          ancho_mm: conf?.ancho_ticket_mm || 80,
          simbolo_moneda: conf?.simbolo_moneda || '$',
          logo_url: tnd?.logo_url ?? null,
          mostrar_logo: conf?.mostrar_logo !== false,
        },
        clienteNombre,
        fecha: formatFechaRecibo(m.created_at),
        monto: Number(m.monto),
        medioPago: m.medio_pago,
        saldoAnterior: Number(m.saldo_anterior),
        saldoPosterior: Number(m.saldo_posterior),
        remitoNumero,
        concepto: m.concepto,
      },
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
