import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ajusteRedondeoEfectivo,
  desgloseVueltoEfectivo,
  sugerirMontoEfectivo,
  vueltoEntregable,
} from './redondeo-efectivo'

describe('redondeo-efectivo', () => {
  it('sugerirMontoEfectivo redondea hacia arriba a $100', () => {
    assert.equal(sugerirMontoEfectivo(1247.33), 1300)
    assert.equal(sugerirMontoEfectivo(1200), 1200)
    assert.equal(sugerirMontoEfectivo(0.01), 100)
    assert.equal(sugerirMontoEfectivo(0), 0)
  })

  it('sugerirMontoEfectivo con activo=false cobra exacto', () => {
    assert.equal(sugerirMontoEfectivo(1247.33, { activo: false }), 1247.33)
    assert.equal(sugerirMontoEfectivo(1200.5, { activo: false }), 1200.5)
  })

  it('vueltoEntregable solo múltiplos de 100', () => {
    assert.equal(vueltoEntregable(753), 700)
    assert.equal(vueltoEntregable(53), 0)
    assert.equal(vueltoEntregable(100), 100)
    assert.equal(vueltoEntregable(99.99), 0)
  })

  it('vueltoEntregable con activo=false devuelve el exceso exacto', () => {
    assert.equal(vueltoEntregable(753.5, { activo: false }), 753.5)
    assert.equal(vueltoEntregable(53.2, { activo: false }), 53.2)
  })

  it('ajusteRedondeoEfectivo es el resto', () => {
    assert.equal(ajusteRedondeoEfectivo(753), 53)
    assert.equal(ajusteRedondeoEfectivo(53), 53)
    assert.equal(ajusteRedondeoEfectivo(53, { activo: false }), 0)
  })

  it('desglose cobrado 5000 total 4347', () => {
    const d = desgloseVueltoEfectivo(5000, 4347)
    assert.equal(d.exceso, 653)
    assert.equal(d.vuelto, 600)
    assert.equal(d.ajuste, 53)
  })

  it('desglose con activo=false no retiene ajuste', () => {
    const d = desgloseVueltoEfectivo(5000, 4347, { activo: false })
    assert.equal(d.exceso, 653)
    assert.equal(d.vuelto, 653)
    assert.equal(d.ajuste, 0)
  })
})
