import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { sumarSubtotalLineas, totalLinea } from './totales-carrito'

describe('totales-carrito', () => {
  it('totalLinea redondea a 2 decimales', () => {
    assert.equal(totalLinea(10.1, 0.333), 3.36)
  })

  it('3 × (10.10 × 0.333) → 10.08 (no 10.09 sin round por línea)', () => {
    const items = [
      { precio_unitario: 10.1, cantidad: 0.333 },
      { precio_unitario: 10.1, cantidad: 0.333 },
      { precio_unitario: 10.1, cantidad: 0.333 },
    ]
    assert.equal(sumarSubtotalLineas(items), 10.08)
  })
})
