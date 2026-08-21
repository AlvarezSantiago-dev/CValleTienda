import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { puedeCobrarVenta } from './puede-cobrar'

describe('puedeCobrarVenta', () => {
  it('false sin ítems', () => {
    assert.equal(
      puedeCobrarVenta({
        hayItems: false,
        stockOk: true,
        totalBruto: 100,
        saldoFavorAplicado: 0,
        pagos: [{ monto: 100 }],
      }),
      false
    )
  })

  it('false si stock no ok', () => {
    assert.equal(
      puedeCobrarVenta({
        hayItems: true,
        stockOk: false,
        totalBruto: 100,
        saldoFavorAplicado: 0,
        pagos: [{ monto: 100 }],
      }),
      false
    )
  })

  it('false sin método de pago (el bug reportado)', () => {
    assert.equal(
      puedeCobrarVenta({
        hayItems: true,
        stockOk: true,
        totalBruto: 100,
        saldoFavorAplicado: 0,
        pagos: [],
      }),
      false
    )
  })

  it('false con pagos insuficientes', () => {
    assert.equal(
      puedeCobrarVenta({
        hayItems: true,
        stockOk: true,
        totalBruto: 100,
        saldoFavorAplicado: 0,
        pagos: [{ monto: 50 }],
      }),
      false
    )
  })

  it('true con método y monto que cubre', () => {
    assert.equal(
      puedeCobrarVenta({
        hayItems: true,
        stockOk: true,
        totalBruto: 100,
        saldoFavorAplicado: 0,
        pagos: [{ monto: 100 }],
      }),
      true
    )
  })

  it('true solo con saldo a favor que cubre el total', () => {
    assert.equal(
      puedeCobrarVenta({
        hayItems: true,
        stockOk: true,
        totalBruto: 100,
        saldoFavorAplicado: 100,
        pagos: [],
      }),
      true
    )
  })

  it('true en cuenta corriente sin pagos', () => {
    assert.equal(
      puedeCobrarVenta({
        hayItems: true,
        stockOk: true,
        totalBruto: 100,
        saldoFavorAplicado: 0,
        pagos: [],
        esCuentaCorriente: true,
      }),
      true
    )
  })

  it('true con saldo parcial + pago que completa', () => {
    assert.equal(
      puedeCobrarVenta({
        hayItems: true,
        stockOk: true,
        totalBruto: 100,
        saldoFavorAplicado: 40,
        pagos: [{ monto: 60 }],
      }),
      true
    )
  })
})
