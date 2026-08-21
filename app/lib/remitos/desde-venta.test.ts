import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { armarRemitoDesdeVenta } from './desde-venta'

const items = [
  {
    nombre_producto: 'Coca 2L',
    talla: null,
    color: null,
    cantidad: 1,
    precio_unitario: 1100,
  },
]

describe('armarRemitoDesdeVenta', () => {
  it('emite cuenta_corriente si hay deuda', () => {
    const r = armarRemitoDesdeVenta({
      montoCc: 700,
      total: 1100,
      clienteNombre: 'Kiosco Sur',
      items,
    })
    assert.equal(r.tipo, 'cuenta_corriente')
    assert.equal(r.destinatario, 'Kiosco Sur')
    assert.equal(r.monto_total, 1100)
  })

  it('emite entrega si no hay deuda', () => {
    const r = armarRemitoDesdeVenta({
      montoCc: 0,
      total: 1000,
      clienteNombre: '  ',
      items,
    })
    assert.equal(r.tipo, 'entrega')
    assert.equal(r.destinatario, 'Cliente')
  })
})
