import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calcularGananciaNeta,
  calcularMargenPct,
  calcularResultadoNeto,
  calcularVentasNetas,
  esDevolucionMonetaria,
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
