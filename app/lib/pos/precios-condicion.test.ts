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

  it('conserva precio manual al sincronizar (ej. al agregar otro ítem)', () => {
    const items = syncCarritoPrecios(
      [
        {
          id: 'a',
          variante_id: 'va',
          precio_unitario: 750,
          precio_contado: 750,
          precio_lista: 750,
          precio_unidad_original: 750,
          cantidad: 1,
          stock_actual: 10,
          codigo_barras: null,
        },
        {
          id: 'b',
          variante_id: 'vb',
          precio_unitario: 2000,
          precio_contado: 2000,
          precio_lista: 2000,
          precio_unidad_original: 2000,
          cantidad: 1,
          stock_actual: 5,
          codigo_barras: null,
        },
      ],
      {
        usarPack: false,
        permiteInfinito: false,
        condicion: 'contado',
        recargoDefault: 0,
      }
    )
    assert.equal(items[0].precio_unitario, 750)
    assert.equal(items[0].precio_contado, 750)
    assert.equal(items[1].precio_unitario, 2000)
  })
})
