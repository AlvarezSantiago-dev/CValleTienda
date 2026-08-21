import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calcularAjusteCc, montoCargoDuplicado, saldoDesdeLedger } from './sync-cargos.ts'

describe('calcularAjusteCc', () => {
  it('corrige venta 10k + seña 4k + cobro remito 3k (saldo 9k)', () => {
    const r = calcularAjusteCc({
      pendienteRemitos: 3000,
      saldo: 9000,
      duplicadoMonto: 6000,
    })
    assert.deepEqual(r, { tipo: 'ajuste', monto: 6000 })
  })

  it('corrige el duplicado antes del cobro parcial', () => {
    const r = calcularAjusteCc({
      pendienteRemitos: 6000,
      saldo: 12000,
      duplicadoMonto: 6000,
    })
    assert.deepEqual(r, { tipo: 'ajuste', monto: 6000 })
  })

  it('no borra deuda de pedido si no hay remito ni duplicado', () => {
    assert.equal(
      calcularAjusteCc({ pendienteRemitos: 0, saldo: 6000, duplicadoMonto: 0 }),
      null
    )
  })

  it('carga remito pendiente sin cargo previo', () => {
    assert.deepEqual(
      calcularAjusteCc({ pendienteRemitos: 5000, saldo: 0, duplicadoMonto: 0 }),
      { tipo: 'cargo', monto: 5000 }
    )
  })

  it('no hace nada si saldo y pendiente coinciden', () => {
    assert.equal(
      calcularAjusteCc({ pendienteRemitos: 3000, saldo: 3000, duplicadoMonto: 6000 }),
      null
    )
  })
})

describe('montoCargoDuplicado', () => {
  it('suma el cargo del remito cuando ya existe cargo de la venta', () => {
    const dup = montoCargoDuplicado(
      [{ id: 'r1', venta_id: 'v1' }],
      [
        { venta_id: 'v1', remito_id: null, monto: 6000 },
        { venta_id: null, remito_id: 'r1', monto: 6000 },
      ]
    )
    assert.equal(dup, 6000)
  })

  it('es 0 si solo hay cargo de venta', () => {
    const dup = montoCargoDuplicado(
      [{ id: 'r1', venta_id: 'v1' }],
      [{ venta_id: 'v1', remito_id: null, monto: 6000 }]
    )
    assert.equal(dup, 0)
  })
})

describe('saldoDesdeLedger', () => {
  it('reproduce el caso 10k seña 4k cobro 3k con duplicado ya ajustado', () => {
    const saldo = saldoDesdeLedger([
      { tipo: 'cargo', monto: 6000 },
      { tipo: 'cargo', monto: 6000 },
      { tipo: 'pago', monto: 3000 },
      { tipo: 'ajuste', monto: 6000 },
    ])
    assert.equal(saldo, 3000)
  })
})
