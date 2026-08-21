import type { SupabaseClient } from '@supabase/supabase-js'
import {
  adjuntarPosicion,
  estaPendiente,
  fechaAcreditacionIso,
  type PendienteItem,
  type PosicionCuenta,
} from './posicion'

type VentaJoin =
  | { id: string; created_at: string; estado: string }
  | Array<{ id: string; created_at: string; estado: string }>
  | null

export async function listarPendientesAcreditacion(opts: {
  supabase: SupabaseClient
  tiendaId: string
  ahora?: Date
}): Promise<Map<string, PendienteItem[]>> {
  const { supabase, tiendaId, ahora = new Date() } = opts
  // Ventana de 90 días: cubre acreditaciones de 14 días y deja margen.
  const lookbackIso = new Date(ahora.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: pagosRaw } = await supabase
    .from('pagos_venta')
    .select(
      'id, cuenta_fondo_id, monto_neto, comision_calculada, dias_acreditacion, created_at, venta:ventas!inner(id, created_at, estado)'
    )
    .eq('tienda_id', tiendaId)
    .eq('venta.estado', 'completada')
    .not('cuenta_fondo_id', 'is', null)
    .gt('dias_acreditacion', 0)
    .gte('created_at', lookbackIso)

  const pagos = (pagosRaw ?? []) as Array<{
    id: string
    cuenta_fondo_id: string | null
    monto_neto: number | string
    comision_calculada: number | string
    dias_acreditacion: number | string
    created_at: string
    venta: VentaJoin
  }>

  const byCuenta = new Map<string, PendienteItem[]>()

  for (const pago of pagos) {
    if (!pago.cuenta_fondo_id) continue
    const dias = Number(pago.dias_acreditacion ?? 0)
    if (dias <= 0) continue

    const fechaAcreditacion = fechaAcreditacionIso(pago.created_at, dias)
    if (!estaPendiente(fechaAcreditacion, ahora)) continue

    const venta = Array.isArray(pago.venta) ? pago.venta[0] : pago.venta
    const item: PendienteItem = {
      pagoVentaId: pago.id,
      ventaId: venta?.id ?? '—',
      montoNeto: Number(pago.monto_neto ?? 0),
      comision: Number(pago.comision_calculada ?? 0),
      fechaVenta: venta?.created_at ?? null,
      fechaAcreditacion,
    }

    const list = byCuenta.get(pago.cuenta_fondo_id) ?? []
    list.push(item)
    byCuenta.set(pago.cuenta_fondo_id, list)
  }

  return byCuenta
}

export function posicionDeCuenta<T extends { id: string; saldo_actual: number }>(
  cuenta: T,
  pendientesPorCuenta: Map<string, PendienteItem[]>
): T & PosicionCuenta {
  return adjuntarPosicion(cuenta, pendientesPorCuenta.get(cuenta.id) ?? [])
}
