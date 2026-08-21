import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calcularCobrado,
  calcularGananciaNeta,
  calcularMargenPct,
  calcularResultadoNeto,
  calcularVentasNetas,
  esDevolucionMonetaria,
  esMesConActividad,
} from './formulas'

describe('calcularVentasNetas', () => {
  it('resta devoluciones monetarias', () => {
    assert.equal(calcularVentasNetas(10000, 2000), 8000)
  })
})

describe('calcularGananciaNeta', () => {
  it('resta ganancia devuelta', () => {
    assert.equal(calcularGananciaNeta(3000, 600), 2400)
  })
})

describe('calcularMargenPct', () => {
  it('calcula margen sobre ventas netas', () => {
    assert.equal(calcularMargenPct(2400, 8000), 30)
  })

  it('retorna null si ventas netas es 0', () => {
    assert.equal(calcularMargenPct(100, 0), null)
  })

  it('retorna null sin costos', () => {
    assert.equal(calcularMargenPct(100, 1000, false), null)
  })
})

describe('calcularResultadoNeto', () => {
  it('resta egresos y comisiones', () => {
    assert.equal(calcularResultadoNeto(5000, 500, 200), 4300)
  })
})

describe('ciclo saldo a favor (jean)', () => {
  it('la devolución sigue restando; el crédito usado es otra venta', () => {
    const brutas = 80_000 + 30_000
    const creditoOtorgado = 30_000
    const creditoUsado = 30_000
    assert.equal(calcularVentasNetas(brutas, creditoOtorgado), 80_000)
    assert.equal(calcularCobrado(brutas, creditoUsado), 80_000)
  })

  it('resta monto a cuenta del cobrado', () => {
    assert.equal(calcularCobrado(1100, 0, 700), 400)
  })
})

describe('esMesConActividad', () => {
  const vacio = {
    cantidadVentas: 0,
    devoluciones: 0,
    egresosManuales: 0,
    comisiones: 0,
    creditoUsado: 0,
  }

  it('oculta meses en cero', () => {
    assert.equal(esMesConActividad(vacio), false)
  })

  it('muestra mes con solo crédito usado', () => {
    assert.equal(esMesConActividad({ ...vacio, creditoUsado: 100 }), true)
  })
})

describe('esDevolucionMonetaria', () => {
  it('excluye cambio', () => {
    assert.equal(esDevolucionMonetaria('cambio'), false)
  })

  it('incluye reembolso y saldo a favor', () => {
    assert.equal(esDevolucionMonetaria('reembolso'), true)
    assert.equal(esDevolucionMonetaria('saldo_a_favor'), true)
  })

  it('incluye null legacy', () => {
    assert.equal(esDevolucionMonetaria(null), true)
    assert.equal(esDevolucionMonetaria(undefined), true)
  })
})
