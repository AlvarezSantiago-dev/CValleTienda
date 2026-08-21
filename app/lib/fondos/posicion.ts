import { addDaysYmd, inicioDiaArgentina, ymdFromIso } from '../datetime'

export interface PendienteItem {
  pagoVentaId: string
  ventaId: string
  montoNeto: number
  comision: number
  fechaVenta: string | null
  fechaAcreditacion: string
}

export interface PosicionCuenta {
  saldoProyectado: number
  porAcreditar: number
  saldoAlMomento: number
  pendienteComision: number
  proximaFechaAcreditacion: string | null
  pendienteFechas: number
  pendientes: PendienteItem[]
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Inicio del día ART en que el cobro debería estar acreditado (días corridos). */
export function fechaAcreditacionIso(createdAtIso: string, dias: number): string {
  if (dias <= 0) return createdAtIso
  const ymd = addDaysYmd(ymdFromIso(createdAtIso), dias)
  return inicioDiaArgentina(ymd)
}

export function estaPendiente(fechaAcreditacionIsoValue: string, ahora: Date = new Date()): boolean {
  return new Date(fechaAcreditacionIsoValue).getTime() > ahora.getTime()
}

export function armarPosicion(saldoActual: number, items: PendienteItem[]): PosicionCuenta {
  const pendientes = items.filter((item) => item.montoNeto > 0)
  const porAcreditar = round2(pendientes.reduce((acc, item) => acc + item.montoNeto, 0))
  const pendienteComision = round2(pendientes.reduce((acc, item) => acc + item.comision, 0))
  const saldoProyectado = round2(saldoActual)
  const saldoAlMomento = Math.max(0, round2(saldoProyectado - porAcreditar))

  let proximaFechaAcreditacion: string | null = null
  for (const item of pendientes) {
    if (!proximaFechaAcreditacion || item.fechaAcreditacion < proximaFechaAcreditacion) {
      proximaFechaAcreditacion = item.fechaAcreditacion
    }
  }

  return {
    saldoProyectado,
    porAcreditar,
    saldoAlMomento,
    pendienteComision,
    proximaFechaAcreditacion,
    pendienteFechas: pendientes.length,
    pendientes,
  }
}

export function adjuntarPosicion<T extends { id: string; saldo_actual: number }>(
  cuenta: T,
  pendientes: PendienteItem[] = []
): T & PosicionCuenta {
  return { ...cuenta, ...armarPosicion(cuenta.saldo_actual, pendientes) }
}
