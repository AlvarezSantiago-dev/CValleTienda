import { requireAuthCtx } from '@/lib/supabase/require-ctx'
import type { MovimientoCc } from '@/types/database'

async function getCtx() {
  const { supabase, tiendaId } = await requireAuthCtx()
  return { supabase, tiendaId }
}

export interface PorCobrarResumen {
  total: number
  clientes: number
}

export async function obtenerTotalPorCobrar(): Promise<PorCobrarResumen> {
  const { supabase, tiendaId } = await getCtx()
  const { data, error } = await supabase
    .from('clientes')
    .select('saldo_cc')
    .eq('tienda_id', tiendaId)
    .gt('saldo_cc', 0)

  if (error) {
    console.error('obtenerTotalPorCobrar', error)
    return { total: 0, clientes: 0 }
  }

  const rows = (data ?? []) as Array<{ saldo_cc: number | string }>
  const total = rows.reduce((acc, row) => acc + Number(row.saldo_cc ?? 0), 0)
  return { total, clientes: rows.length }
}

export async function listarMovimientosCc(clienteId: string): Promise<MovimientoCc[]> {
  const { supabase, tiendaId } = await getCtx()
  const { data, error } = await supabase
    .from('movimientos_cc')
    .select(
      'id, tienda_id, cliente_id, tipo, monto, saldo_anterior, saldo_posterior, concepto, venta_id, remito_id, usuario_id, medio_pago, created_at'
    )
    .eq('tienda_id', tiendaId)
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false })
    .limit(80)

  if (error) {
    console.error('listarMovimientosCc', error)
    return []
  }
  return (data ?? []) as MovimientoCc[]
}

export interface RemitoPendienteCc {
  id: string
  numero_remito: number
  pendiente: number
  monto_total: number
  monto_cobrado: number
  created_at: string
}

export async function listarRemitosPendientesCliente(
  clienteId: string
): Promise<RemitoPendienteCc[]> {
  const { supabase, tiendaId } = await getCtx()
  const { data, error } = await supabase
    .from('remitos')
    .select('id, numero_remito, monto_total, monto_cobrado, created_at')
    .eq('tienda_id', tiendaId)
    .eq('cliente_id', clienteId)
    .eq('tipo', 'cuenta_corriente')
    .eq('estado_cobro', 'pendiente')
    .neq('estado', 'anulado')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('listarRemitosPendientesCliente', error)
    return []
  }

  return ((data ?? []) as Array<Record<string, unknown>>)
    .map((r) => {
      const total = Number(r.monto_total ?? 0)
      const cobrado = Number(r.monto_cobrado ?? 0)
      return {
        id: r.id as string,
        numero_remito: Number(r.numero_remito),
        monto_total: total,
        monto_cobrado: cobrado,
        pendiente: Math.max(0, total - cobrado),
        created_at: r.created_at as string,
      }
    })
    .filter((r) => r.pendiente > 0.01)
}
