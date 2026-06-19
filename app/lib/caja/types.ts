// Tipos e helpers de caja sin dependencias de servidor
// Importable tanto desde Server Components como Client Components

export interface UsuarioLite {
  id: string
  nombre: string | null
  apellido: string | null
}

export function nombreUsuario(u: UsuarioLite | null): string | null {
  if (!u) return null
  const full = `${u.nombre ?? ''} ${u.apellido ?? ''}`.trim()
  return full || null
}

export interface SesionCaja {
  id: string
  tienda_id: string
  fecha_apertura: string
  fecha_cierre: string | null
  monto_apertura_efectivo: number
  estado: 'abierta' | 'cerrada'
  observaciones_apertura: string | null
  observaciones_cierre: string | null
  usuario_apertura: UsuarioLite | null
}

export interface SaldoCuenta {
  cuenta_fondo_id: string
  nombre: string
  tipo: string
  color: string | null
  saldo_actual: number
  saldoDisponibleEstimado?: number
  pendientePorAcreditar?: number
  pendienteComision?: number
  proximaFechaAcreditacion?: string | null
  pendienteFechas?: number
}

export interface SesionConTotales extends SesionCaja {
  total_ventas_monto: number
  total_ventas_cantidad: number
  saldos_cuentas: SaldoCuenta[]
}

/** Versión liviana para banner del dashboard (sin saldos ni acreditaciones). */
export interface SesionAbiertaLite {
  id: string
  fecha_apertura: string
  total_ventas_monto: number
  total_ventas_cantidad: number
}

export interface DetalleCuentaTurno {
  cuenta_fondo_id: string
  nombre_cuenta: string
  tipo_cuenta: string
  total_ingresos: number
  total_egresos: number
  comision_estimada: number
  total_neto: number
  saldo_antes_turno: number
  saldo_despues_turno: number
}

export interface PagoPorCuentaTurno {
  nombre_cuenta: string
  cantidad_pagos: number
  monto_bruto: number
  comision: number
  monto_neto: number
}

export interface ResumenTurno {
  total_ventas_monto: number
  total_ventas_cantidad: number
  total_devoluciones_monto: number
  total_devoluciones_cantidad: number
  total_comisiones: number
  total_neto: number
  monto_apertura_efectivo: number
  efectivo_esperado: number
  detalle_por_cuenta: DetalleCuentaTurno[]
  pagos_por_cuenta: PagoPorCuentaTurno[]
}

export interface VentaTurnoItem {
  id: string
  numero_ticket: number | null
  total: number
  created_at: string
  vendedor: string | null
}

export interface TopProductoTurno {
  nombre: string
  cantidad: number
  subtotal: number
}

export interface MovimientoTurno {
  id: string
  tipo: 'ingreso' | 'egreso' | 'ajuste'
  concepto: string
  monto: number
  saldo_posterior: number
  nombre_cuenta: string
  tipo_cuenta: string
  created_at: string
  es_manual: boolean
}
