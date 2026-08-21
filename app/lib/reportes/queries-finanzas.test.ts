import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { deltaPct, filaPorMesISO, filaMesAnterior } from './queries-finanzas'
import type { FilaMesReporte } from './queries'

const base = (anio: number, mes: number, ventasNetas: number): FilaMesReporte => ({
  anio,
  mes,
  mesLabel: `${mes}/${anio}`,
  cantidadVentas: 10,
  ventasBrutas: ventasNetas,
  devoluciones: 0,
  devolucionesReembolso: 0,
  devolucionesCredito: 0,
  creditoUsado: 0,
  cobrado: ventasNetas,
  ventasNetas,
  costoTotal: 0,
  gananciaBruta: 0,
  egresosManuales: 0,
  comisiones: 0,
  resultadoNeto: ventasNetas * 0.2,
  margenPct: null,
  tieneCostos: false,
})

describe('deltaPct', () => {
  it('calcula incremento', () => {
    assert.equal(deltaPct(110, 100), 10)
  })

  it('calcula decremento', () => {
    assert.equal(deltaPct(90, 100), -10)
  })

  it('retorna null si anterior es 0', () => {
    assert.equal(deltaPct(100, 0), null)
  })
})

describe('filaPorMesISO', () => {
  const filas = [base(2026, 5, 5000), base(2026, 6, 8000)]

  it('encuentra mes', () => {
    assert.equal(filaPorMesISO(filas, '2026-06')?.ventasNetas, 8000)
  })

  it('retorna null si no existe', () => {
    assert.equal(filaPorMesISO(filas, '2026-01'), null)
  })
})

describe('filaMesAnterior', () => {
  const filas = [base(2026, 5, 5000), base(2026, 6, 8000)]

  it('mes anterior en mismo año', () => {
    assert.equal(filaMesAnterior(filas, '2026-06')?.ventasNetas, 5000)
  })
})
