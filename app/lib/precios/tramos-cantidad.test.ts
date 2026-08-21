import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  descuentoPctTramo,
  precioConTramo,
  validarTramos,
} from './tramos-cantidad.ts'

const COCA = [
  { cantidad_desde: 2, descuento_pct: 10 },
  { cantidad_desde: 10, descuento_pct: 20 },
]

describe('descuentoPctTramo', () => {
  it('sin tramos es 0', () => {
    assert.equal(descuentoPctTramo([], 10), 0)
  })

  it('qty 1 no entra al primer tramo', () => {
    assert.equal(descuentoPctTramo(COCA, 1), 0)
  })

  it('qty 2 usa 10 %', () => {
    assert.equal(descuentoPctTramo(COCA, 2), 10)
  })

  it('qty 10 usa 20 % (no apila)', () => {
    assert.equal(descuentoPctTramo(COCA, 10), 20)
  })
})

describe('precioConTramo', () => {
  it('Coca $10.000: 1 / 2 / 10 unidades', () => {
    assert.equal(precioConTramo(10000, COCA, 1), 10000)
    assert.equal(precioConTramo(10000, COCA, 2), 9000)
    assert.equal(precioConTramo(10000, COCA, 10), 8000)
  })

  it('sin tramos = lista', () => {
    assert.equal(precioConTramo(10000, [], 50), 10000)
  })
})

describe('validarTramos', () => {
  it('acepta vacío', () => {
    const r = validarTramos([])
    assert.equal(r.ok, true)
  })

  it('rechaza cantidades duplicadas', () => {
    const r = validarTramos([
      { cantidad_desde: 2, descuento_pct: 10 },
      { cantidad_desde: 2, descuento_pct: 20 },
    ])
    assert.equal(r.ok, false)
  })
})
