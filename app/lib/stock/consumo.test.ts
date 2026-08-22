import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { consumoFisicoAgrupado, maxPresentaciones, unidadesFisicas } from './consumo'
import { STOCK_INFINITO } from './infinito'

describe('consumo de stock', () => {
  it('unidadesFisicas multiplica packs', () => {
    assert.equal(unidadesFisicas(3, null), 3)
    assert.equal(unidadesFisicas(2, 8), 16)
    assert.equal(unidadesFisicas(2, 1), 2)
  })

  it('maxPresentaciones respeta stock y pack', () => {
    assert.equal(maxPresentaciones(10, null), 10)
    assert.equal(maxPresentaciones(10, 8), 1)
    assert.equal(maxPresentaciones(7, 8), 0)
    assert.equal(maxPresentaciones(24, 8, false, 20), 3)
  })

  it('maxPresentaciones ilimitado', () => {
    assert.equal(maxPresentaciones(STOCK_INFINITO, 8, true, 20), 20)
    assert.equal(maxPresentaciones(STOCK_INFINITO, 8, false), 0)
  })

  it('agrupa consumo de unidad + pack de la misma variante', () => {
    const m = consumoFisicoAgrupado([
      { varianteId: 'a', cantidad: 3, packUnidades: null },
      { varianteId: 'a', cantidad: 1, packUnidades: 8 },
      { varianteId: 'b', cantidad: 2, packUnidades: 6 },
    ])
    assert.equal(m.get('a'), 11)
    assert.equal(m.get('b'), 12)
  })
})
