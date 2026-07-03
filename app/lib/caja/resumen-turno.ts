import type { Cierre } from './queries'
import type { DetalleCuentaTurno, PagoPorCuentaTurno, ResumenTurno } from './types'

export type { ResumenTurno, DetalleCuentaTurno, PagoPorCuentaTurno } from './types'

function num(v: unknown): number {
  return Number(v ?? 0)
}

function mapDetalleCuenta(raw: Record<string, unknown>): DetalleCuentaTurno {
  return {
    cuenta_fondo_id: (raw.cuenta_fondo_id as string) ?? '',
    nombre_cuenta: (raw.nombre_cuenta as string) ?? '',
    tipo_cuenta: (raw.tipo_cuenta as string) ?? '',
    total_ingresos: num(raw.total_ingresos),
    total_egresos: num(raw.total_egresos),
    comision_estimada: num(raw.comision_estimada),
    total_neto: num(raw.total_neto),
    saldo_antes_turno: num(raw.saldo_antes_turno),
    saldo_despues_turno: num(raw.saldo_despues_turno),
  }
}

function mapPagoPorCuenta(raw: Record<string, unknown>): PagoPorCuentaTurno {
  return {
    nombre_cuenta: (raw.nombre_cuenta as string) ?? '',
    cantidad_pagos: Number(raw.cantidad_pagos ?? 0),
    monto_bruto: num(raw.monto_bruto),
    comision: num(raw.comision),
    monto_neto: num(raw.monto_neto),
  }
}

export function mapResumenTurnoFromRpc(data: unknown): ResumenTurno | null {
  if (!data || typeof data !== 'object') return null
  const r = data as Record<string, unknown>

  const detalleRaw = Array.isArray(r.detalle_por_cuenta) ? r.detalle_por_cuenta : []
  const pagosRaw = Array.isArray(r.pagos_por_cuenta) ? r.pagos_por_cuenta : []

  return {
    total_ventas_monto: num(r.total_ventas_monto),
    total_ventas_cantidad: Number(r.total_ventas_cantidad ?? 0),
    total_devoluciones_monto: num(r.total_devoluciones_monto),
    total_devoluciones_cantidad: Number(r.total_devoluciones_cantidad ?? 0),
    total_devoluciones_reintegro: num(r.total_devoluciones_reintegro),
    total_devoluciones_credito: num(r.total_devoluciones_credito),
    total_comisiones: num(r.total_comisiones),
    total_neto: num(r.total_neto),
    monto_apertura_efectivo: num(r.monto_apertura_efectivo),
    efectivo_esperado: num(r.efectivo_esperado),
    detalle_por_cuenta: detalleRaw.map((d) => mapDetalleCuenta(d as Record<string, unknown>)),
    pagos_por_cuenta: pagosRaw.map((p) => mapPagoPorCuenta(p as Record<string, unknown>)),
  }
}

/** Convierte un cierre persistido a ResumenTurno (sin pagos_por_cuenta). */
export function cierreToResumenTurno(cierre: Cierre): ResumenTurno {
  return {
    total_ventas_monto: cierre.total_ventas_monto,
    total_ventas_cantidad: cierre.total_ventas_cantidad,
    total_devoluciones_monto: cierre.total_devoluciones_monto,
    total_devoluciones_cantidad: cierre.total_devoluciones_cantidad,
    total_devoluciones_reintegro: cierre.total_devoluciones_reintegro,
    total_devoluciones_credito: cierre.total_devoluciones_credito,
    total_comisiones: cierre.detalles.reduce((a, d) => a + d.comision_estimada, 0),
    total_neto: cierre.total_neto,
    monto_apertura_efectivo: cierre.monto_apertura_efectivo,
    efectivo_esperado: cierre.efectivo_esperado,
    detalle_por_cuenta: cierre.detalles.map((d) => ({
      cuenta_fondo_id: d.cuenta_fondo_id ?? '',
      nombre_cuenta: d.nombre_cuenta,
      tipo_cuenta: d.tipo_cuenta,
      total_ingresos: d.total_ingresos,
      total_egresos: d.total_egresos,
      comision_estimada: d.comision_estimada,
      total_neto: d.total_neto,
      saldo_antes_turno: d.saldo_antes_turno,
      saldo_despues_turno: d.saldo_despues_turno,
    })),
    pagos_por_cuenta: [],
  }
}
