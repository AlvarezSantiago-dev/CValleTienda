import type { SupabaseClient } from '@supabase/supabase-js'

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export type AjusteCc = { tipo: 'cargo' | 'ajuste'; monto: number }

/**
 * Alinea saldo_cc a remitos pendientes.
 * Solo baja la deuda si hay cargo duplicado (pedido + remito).
 */
export function calcularAjusteCc(opts: {
  pendienteRemitos: number
  saldo: number
  duplicadoMonto: number
}): AjusteCc | null {
  const pendiente = round2(opts.pendienteRemitos)
  const saldo = round2(opts.saldo)
  const duplicado = round2(Math.max(0, opts.duplicadoMonto))
  const faltante = round2(pendiente - saldo)
  if (faltante > 0.01) return { tipo: 'cargo', monto: faltante }

  const exceso = round2(saldo - pendiente)
  if (exceso > 0.01 && duplicado > 0.01) {
    return { tipo: 'ajuste', monto: Math.min(exceso, duplicado) }
  }
  return null
}

export function saldoDesdeLedger(
  movs: Array<{ tipo: string; monto: number }>
): number {
  return round2(
    movs.reduce((acc, m) => {
      const monto = Number(m.monto)
      return m.tipo === 'cargo' ? acc + monto : acc - monto
    }, 0)
  )
}

export function montoCargoDuplicado(
  remitos: Array<{ id: string; venta_id: string | null }>,
  cargos: Array<{ venta_id: string | null; remito_id: string | null; monto: number }>
): number {
  const ventaIdsConCargo = new Set(
    cargos.map((c) => c.venta_id).filter((id): id is string => !!id)
  )
  const cargoPorRemito = new Map<string, number>()
  for (const c of cargos) {
    if (!c.remito_id) continue
    cargoPorRemito.set(c.remito_id, round2((cargoPorRemito.get(c.remito_id) ?? 0) + Number(c.monto)))
  }

  let duplicado = 0
  for (const r of remitos) {
    if (!r.venta_id || !ventaIdsConCargo.has(r.venta_id)) continue
    const extra = cargoPorRemito.get(r.id) ?? 0
    if (extra > 0.01) duplicado = round2(duplicado + extra)
  }
  return duplicado
}

/**
 * Deja saldo_cc alineado a remitos CC pendientes, sin duplicar cargos del pedido.
 */
export async function reconciliarSaldoCcCliente(
  supabase: SupabaseClient,
  opts: { tiendaId: string; userId: string; clienteId: string }
): Promise<{ error?: string; saldoCc?: number }> {
  const { tiendaId, userId, clienteId } = opts

  const { data: remitos, error: errR } = await supabase
    .from('remitos')
    .select('id, venta_id, monto_total, monto_cobrado, estado_cobro')
    .eq('tienda_id', tiendaId)
    .eq('cliente_id', clienteId)
    .eq('tipo', 'cuenta_corriente')
    .neq('estado', 'anulado')

  if (errR) return { error: errR.message }

  const rows = (remitos ?? []) as Array<{
    id: string
    venta_id: string | null
    monto_total: number
    monto_cobrado: number
    estado_cobro: string
  }>

  const pendienteRemitos = round2(
    rows
      .filter((r) => r.estado_cobro === 'pendiente')
      .reduce(
        (acc, r) => acc + Math.max(0, Number(r.monto_total) - Number(r.monto_cobrado ?? 0)),
        0
      )
  )

  const { data: movs, error: errMov } = await supabase
    .from('movimientos_cc')
    .select('tipo, monto, venta_id, remito_id')
    .eq('tienda_id', tiendaId)
    .eq('cliente_id', clienteId)

  if (errMov) return { error: errMov.message }

  const movimientos = (movs ?? []) as Array<{
    tipo: string
    monto: number
    venta_id: string | null
    remito_id: string | null
  }>

  const duplicadoMonto = montoCargoDuplicado(
    rows,
    movimientos.filter((m) => m.tipo === 'cargo')
  )

  const ledger = Math.max(0, saldoDesdeLedger(movimientos))
  const ajuste = calcularAjusteCc({
    pendienteRemitos,
    saldo: ledger,
    duplicadoMonto,
  })

  if (ajuste) {
    const { error } = await supabase.rpc('registrar_movimiento_cc', {
      p_tienda_id: tiendaId,
      p_cliente_id: clienteId,
      p_tipo: ajuste.tipo,
      p_monto: ajuste.monto,
      p_concepto:
        ajuste.tipo === 'cargo'
          ? 'Ajuste deuda remitos pendientes'
          : 'Corrección deuda duplicada (remito)',
      p_venta_id: null,
      p_remito_id: null,
      p_usuario_id: userId,
    })
    if (error) return { error: error.message }
  }

  const saldoFinal = ajuste
    ? round2(ajuste.tipo === 'cargo' ? ledger + ajuste.monto : ledger - ajuste.monto)
    : ledger

  const { error: errUp } = await supabase
    .from('clientes')
    .update({ saldo_cc: Math.max(0, saldoFinal) })
    .eq('id', clienteId)
    .eq('tienda_id', tiendaId)

  if (errUp) return { error: errUp.message }
  return { saldoCc: Math.max(0, saldoFinal) }
}
