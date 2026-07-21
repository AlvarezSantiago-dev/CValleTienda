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

  it('tieneStockSuficiente con permiso', () => {
    assert.equal(tieneStockSuficiente(-1, 999, true), true)
    assert.equal(tieneStockSuficiente(5, 5, true), true)
    assert.equal(tieneStockSuficiente(5, 6, true), false)
  })

  it('tieneStockSuficiente sin permiso: -1 no alcanza', () => {
    assert.equal(tieneStockSuficiente(-1, 1, false), false)
    assert.equal(tieneStockSuficiente(-1, 1), false)
    assert.equal(tieneStockSuficiente(5, 5, false), true)
  })

  it('esStockVendible respeta permiso', () => {
    assert.equal(esStockVendible(-1, true), true)
    assert.equal(esStockVendible(-1, false), false)
    assert.equal(esStockVendible(1, false), true)
    assert.equal(esStockVendible(0, false), false)
  })

  it('esStockValido', () => {
    assert.equal(esStockValido(-1), true)
    assert.equal(esStockValido(0), true)
    assert.equal(esStockValido(10), true)
    assert.equal(esStockValido(-2), false)
  })

  it('stockEfectivoDesdeComponentes', () => {
    assert.equal(
      stockEfectivoDesdeComponentes(
        [
          { stock: -1, cantidad: 1 },
          { stock: 10, cantidad: 2 },
        ],
        true
      ),
      5
    )
    assert.equal(
      stockEfectivoDesdeComponentes(
        [
          { stock: -1, cantidad: 1 },
          { stock: -1, cantidad: 2 },
        ],
        true
      ),
      STOCK_INFINITO
    )
    assert.equal(
      stockEfectivoDesdeComponentes([{ stock: -1, cantidad: 1 }], false),
      0
    )
  })

  it('stockEfectivoPack', () => {
    assert.equal(stockEfectivoPack(-1, 6, true), STOCK_INFINITO)
    assert.equal(stockEfectivoPack(-1, 6, false), 0)
    assert.equal(stockEfectivoPack(12, 6, false), 2)
  })

  it('formatStockDisplay', () => {
    assert.equal(formatStockDisplay(-1, { permiteInfinito: true }), 'Ilimitado')
    assert.equal(formatStockDisplay(-1, { corto: true, permiteInfinito: true }), '∞')
    assert.equal(formatStockDisplay(-1, { permiteInfinito: false }), '0')
    assert.equal(formatStockDisplay(10), '10')
  })
})
