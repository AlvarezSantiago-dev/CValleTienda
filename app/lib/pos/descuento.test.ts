import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  descuentoDesdePorcentaje,
  limitarDescuentoASubtotal,
  porcentajeEfectivo,
} from './descuento'

describe('descuentoDesdePorcentaje', () => {
  it('calcula 10% sobre 10000', () => {
    assert.equal(descuentoDesdePorcentaje(10000, 10), 1000)
  })

  it('calcula 5% y 15% sobre 10000', () => {
    assert.equal(descuentoDesdePorcentaje(10000, 5), 500)
    assert.equal(descuentoDesdePorcentaje(10000, 15), 1500)
  })

  it('redondea decimales del subtotal', () => {
    assert.equal(descuentoDesdePorcentaje(1234.56, 10), 123.46)
  })

  it('acepta porcentaje decimal', () => {
    assert.equal(descuentoDesdePorcentaje(1000, 7.5), 75)
  })

  it('limita al subtotal cuando el porcentaje supera 100%', () => {
    assert.equal(descuentoDesdePorcentaje(500, 200), 500)
  })

  it('retorna 0 con subtotal 0', () => {
    assert.equal(descuentoDesdePorcentaje(0, 10), 0)
  })
})

describe('limitarDescuentoASubtotal', () => {
  it('cap descuento al subtotal', () => {
    assert.equal(limitarDescuentoASubtotal(100, 500), 100)
  })

  it('mantiene descuento válido', () => {
    assert.equal(limitarDescuentoASubtotal(1000, 200), 200)
  })
})

describe('porcentajeEfectivo', () => {
  it('calcula porcentaje con un decimal', () => {
    assert.equal(porcentajeEfectivo(10000, 1000), 10)
    assert.equal(porcentajeEfectivo(1000, 75), 7.5)
  })

  it('retorna null sin descuento', () => {
    assert.equal(porcentajeEfectivo(1000, 0), null)
  })
})
