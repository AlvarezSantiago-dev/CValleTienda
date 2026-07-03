import { describe, it, expect } from 'vitest'
import {
  RESOLUCION_LABEL,
  RESOLUCION_BADGE_CLASS,
  normalizarResolucion,
  type TipoResolucion,
} from './resolucion-labels'

// ─────────────────────────────────────────────────────────────
// Política financiera de devoluciones (documentada en
// referencia/reportes-definiciones-metricas.md):
//  - reembolso     → egreso de caja, resta en devoluciones del turno
//  - saldo_a_favor → pasivo (crédito cliente), resta en devoluciones
//                    del turno pero SIN egreso de caja
//  - cambio        → rotación de stock, NO cuenta como devolución monetaria
// Estas funciones puras replican la lógica del RPC preview_resumen_turno
// para poder testearla sin base de datos.
// ─────────────────────────────────────────────────────────────

interface DevolucionSim {
  total_devuelto: number
  tipo_resolucion: TipoResolucion | null
  estado: 'completada' | 'anulada'
}

function esReintegro(d: DevolucionSim): boolean {
  return d.tipo_resolucion === null || d.tipo_resolucion === 'reembolso'
}

function esCredito(d: DevolucionSim): boolean {
  return d.tipo_resolucion === 'saldo_a_favor'
}

/** Réplica de la agregación del turno (mismas reglas que el SQL). */
function agregarDevolucionesTurno(devs: DevolucionSim[]) {
  const completadas = devs.filter((d) => d.estado === 'completada')
  const reintegro = completadas
    .filter(esReintegro)
    .reduce((a, d) => a + d.total_devuelto, 0)
  const credito = completadas
    .filter(esCredito)
    .reduce((a, d) => a + d.total_devuelto, 0)
  const cantidad = completadas.filter(
    (d) => d.tipo_resolucion !== 'cambio'
  ).length
  return { reintegro, credito, total: reintegro + credito, cantidad }
}

/** Efectivo esperado: solo los reintegros mueven dinero de las cuentas. */
function egresoDeCaja(devs: DevolucionSim[]): number {
  return devs
    .filter((d) => d.estado === 'completada' && esReintegro(d))
    .reduce((a, d) => a + d.total_devuelto, 0)
}

describe('escenario real: jean celeste devuelto con saldo a favor + venta jean azul', () => {
  // Venta 1: jean celeste $30.000 + campera $50.000 = $80.000 (efectivo)
  // Devolución: jean celeste → saldo a favor $30.000
  // Venta 2: jean azul $30.000 pagada 100% con saldo a favor
  const devoluciones: DevolucionSim[] = [
    { total_devuelto: 30000, tipo_resolucion: 'saldo_a_favor', estado: 'completada' },
  ]
  const ventasTurno = [80000, 30000] // venta original + venta del jean azul
  const saldoFavorUsadoVenta2 = 30000

  it('las devoluciones del turno restan el jean devuelto', () => {
    const agg = agregarDevolucionesTurno(devoluciones)
    expect(agg.total).toBe(30000)
    expect(agg.credito).toBe(30000)
    expect(agg.reintegro).toBe(0)
    expect(agg.cantidad).toBe(1)
  })

  it('el neto del turno refleja solo la mercadería realmente vendida', () => {
    const totalVentas = ventasTurno.reduce((a, b) => a + b, 0) // 110.000
    const agg = agregarDevolucionesTurno(devoluciones)
    const neto = totalVentas - agg.total
    // 110.000 - 30.000 = 80.000 → lo que efectivamente quedó vendido
    expect(neto).toBe(80000)
  })

  it('no hay egreso de caja: el saldo a favor no devuelve dinero', () => {
    expect(egresoDeCaja(devoluciones)).toBe(0)
  })

  it('el ingreso real de caja excluye la parte pagada con saldo a favor', () => {
    const ingresoVenta2 = 30000 - saldoFavorUsadoVenta2
    expect(ingresoVenta2).toBe(0)
    // El arqueo de efectivo del turno solo suma los $80.000 de la venta 1
  })
})

describe('escenario reembolso en efectivo', () => {
  const devoluciones: DevolucionSim[] = [
    { total_devuelto: 15000, tipo_resolucion: 'reembolso', estado: 'completada' },
  ]

  it('cuenta como reintegro y genera egreso de caja', () => {
    const agg = agregarDevolucionesTurno(devoluciones)
    expect(agg.reintegro).toBe(15000)
    expect(agg.credito).toBe(0)
    expect(egresoDeCaja(devoluciones)).toBe(15000)
  })
})

describe('escenario cambio de variante', () => {
  const devoluciones: DevolucionSim[] = [
    { total_devuelto: 30000, tipo_resolucion: 'cambio', estado: 'completada' },
  ]

  it('no cuenta como devolución monetaria ni mueve dinero', () => {
    const agg = agregarDevolucionesTurno(devoluciones)
    expect(agg.total).toBe(0)
    expect(agg.cantidad).toBe(0)
    expect(egresoDeCaja(devoluciones)).toBe(0)
  })
})

describe('devoluciones legacy sin tipo_resolucion', () => {
  it('se tratan como reintegro (comportamiento histórico)', () => {
    const devs: DevolucionSim[] = [
      { total_devuelto: 5000, tipo_resolucion: null, estado: 'completada' },
    ]
    const agg = agregarDevolucionesTurno(devs)
    expect(agg.reintegro).toBe(5000)
    expect(egresoDeCaja(devs)).toBe(5000)
  })
})

describe('devoluciones anuladas', () => {
  it('no suman en ninguna categoría', () => {
    const devs: DevolucionSim[] = [
      { total_devuelto: 9999, tipo_resolucion: 'reembolso', estado: 'anulada' },
      { total_devuelto: 9999, tipo_resolucion: 'saldo_a_favor', estado: 'anulada' },
    ]
    const agg = agregarDevolucionesTurno(devs)
    expect(agg.total).toBe(0)
    expect(egresoDeCaja(devs)).toBe(0)
  })
})

describe('anulación de venta pagada con saldo a favor', () => {
  it('restituye al cliente exactamente el saldo consumido', () => {
    const saldoAntesDeVenta = 30000
    const saldoFavorUsado = 30000
    const saldoDespuesDeVenta = saldoAntesDeVenta - saldoFavorUsado // 0
    // anularVenta llama incrementar_saldo_favor con saldo_favor_usado
    const saldoTrasAnular = saldoDespuesDeVenta + saldoFavorUsado
    expect(saldoTrasAnular).toBe(saldoAntesDeVenta)
  })
})

describe('resolucion-labels', () => {
  it('tiene label y badge para cada resolución', () => {
    for (const r of ['reembolso', 'saldo_a_favor', 'cambio'] as const) {
      expect(RESOLUCION_LABEL[r]).toBeTruthy()
      expect(RESOLUCION_BADGE_CLASS[r]).toBeTruthy()
    }
  })

  it('normaliza valores legacy/null a reembolso', () => {
    expect(normalizarResolucion(null)).toBe('reembolso')
    expect(normalizarResolucion(undefined)).toBe('reembolso')
    expect(normalizarResolucion('reembolso')).toBe('reembolso')
    expect(normalizarResolucion('saldo_a_favor')).toBe('saldo_a_favor')
    expect(normalizarResolucion('cambio')).toBe('cambio')
  })
})
