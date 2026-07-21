import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  STOCK_INFINITO,
  esStockInfinito,
  tieneStockSuficiente,
  esStockVendible,
  esStockValido,
  stockEfectivoDesdeComponentes,
  stockEfectivoPack,
  formatStockDisplay,
} from './infinito'

describe('stock infinito', () => {
  it('detecta sentinel -1', () => {
    assert.equal(esStockInfinito(-1), true)
    assert.equal(esStockInfinito(STOCK_INFINITO), true)
    assert.equal(esStockInfinito(0), false)
    assert.equal(esStockInfinito(5), false)
    assert.equal(esStockInfinito(-2), false)
  })

  it('tieneStockSuficiente', () => {
    assert.equal(tieneStockSuficiente(-1, 999), true)
    assert.equal(tieneStockSuficiente(5, 5), true)
    assert.equal(tieneStockSuficiente(5, 6), false)
    assert.equal(tieneStockSuficiente(0, 1), false)
  })

  it('esStockVendible', () => {
    assert.equal(esStockVendible(-1), true)
    assert.equal(esStockVendible(1), true)
    assert.equal(esStockVendible(0), false)
  })

  it('esStockValido', () => {
    assert.equal(esStockValido(-1), true)
    assert.equal(esStockValido(0), true)
    assert.equal(esStockValido(10), true)
    assert.equal(esStockValido(-2), false)
  })

  it('stockEfectivoDesdeComponentes ignora infinitos', () => {
    assert.equal(
      stockEfectivoDesdeComponentes([
        { stock: -1, cantidad: 1 },
        { stock: 10, cantidad: 2 },
      ]),
      5
    )
    assert.equal(
      stockEfectivoDesdeComponentes([
        { stock: -1, cantidad: 1 },
        { stock: -1, cantidad: 2 },
      ]),
      STOCK_INFINITO
    )
    assert.equal(stockEfectivoDesdeComponentes([]), 0)
  })

  it('stockEfectivoPack', () => {
    assert.equal(stockEfectivoPack(-1, 6), STOCK_INFINITO)
    assert.equal(stockEfectivoPack(12, 6), 2)
  })

  it('formatStockDisplay', () => {
    assert.equal(formatStockDisplay(-1), 'Ilimitado')
    assert.equal(formatStockDisplay(-1, { corto: true }), '∞')
    assert.equal(formatStockDisplay(10), '10')
  })
})
