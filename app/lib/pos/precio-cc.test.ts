import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { precioConRecargoCc, recargoEfectivo } from './precio-cc'

describe('recargoEfectivo', () => {
  it('usa el recargo del producto si está definido', () => {
    assert.equal(recargoEfectivo(10, 5), 10)
    assert.equal(recargoEfectivo(0, 5), 0)
  })

  it('cae al default de tienda si el producto no tiene recargo', () => {
    assert.equal(recargoEfectivo(null, 8), 8)
    assert.equal(recargoEfectivo(undefined, 8), 8)
  })

  it('no permite recargo negativo', () => {
    assert.equal(recargoEfectivo(-3, 5), 0)
    assert.equal(recargoEfectivo(null, -2), 0)
  })
})

describe('precioConRecargoCc', () => {
  it('aplica 10% sobre 1000', () => {
    assert.equal(precioConRecargoCc(1000, 10), 1100)
  })

  it('0% deja el precio de contado', () => {
    assert.equal(precioConRecargoCc(1000, 0), 1000)
  })

  it('redondea a 2 decimales', () => {
    assert.equal(precioConRecargoCc(99.99, 10), 109.99)
  })

  it('aplica el recargo sobre el precio ya resuelto (pack)', () => {
    assert.equal(precioConRecargoCc(5400, 10), 5940)
  })
})
