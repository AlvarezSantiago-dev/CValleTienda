import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { aplicarPreciosCondicion, syncCarritoPrecios } from './precios-condicion'

describe('aplicarPreciosCondicion', () => {
  it('aplica recargo al pasar a cuenta corriente', () => {
    const [it] = aplicarPreciosCondicion(
      [{ precio_unitario: 1000, precio_contado: 1000, recargo_cc_pct: 10 }],
      'cuenta_corriente',
      0
    )
    assert.equal(it.precio_unitario, 1100)
    assert.equal(it.precio_contado, 1000)
  })

  it('restaura contado al volver', () => {
    const [it] = aplicarPreciosCondicion(
      [{ precio_unitario: 1100, precio_contado: 1000, recargo_cc_pct: 10 }],
      'contado',
      0
    )
    assert.equal(it.precio_unitario, 1000)
  })

  it('usa default de tienda si el producto no tiene recargo', () => {
    const [it] = aplicarPreciosCondicion(
      [{ precio_unitario: 1000, precio_contado: 1000, recargo_cc_pct: null }],
      'cuenta_corriente',
      5
    )
    assert.equal(it.precio_unitario, 1050)
  })
})

describe('syncCarritoPrecios tramo + recargo', () => {
  it('aplica tramo y después recargo CC', () => {
    const [it] = syncCarritoPrecios(
      [
        {
          id: '1',
          variante_id: 'v1',
          precio_unitario: 10000,
          cantidad: 2,
          stock_actual: 10,
          codigo_barras: null,
          precio_lista: 10000,
          tramos: [{ cantidad_desde: 2, descuento_pct: 10 }],
          recargo_cc_pct: 10,
        },
      ],
      {
        usarPack: false,
        permiteInfinito: false,
        condicion: 'cuenta_corriente',
        recargoDefault: 0,
      }
    )
    assert.equal(it.precio_contado, 9000)
    assert.equal(it.precio_unitario, 9900)
  })
})
