import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { armarPropuestaVenta, resumenPropuestaVenta } from './propuesta'

const coca = {
  variante_id: 'v1',
  etiqueta: 'Coca Cola 3L',
  cantidad: 3,
  precio_unitario: 5000,
}
const paleta = {
  variante_id: 'v2',
  etiqueta: 'Paleta (kg)',
  cantidad: 0.359,
  precio_unitario: 9000,
}
const aceite = {
  variante_id: 'v3',
  etiqueta: 'Aceite girasol 2,25L',
  cantidad: 1,
  precio_unitario: 4200,
}

describe('armarPropuestaVenta', () => {
  it('venta simple: subtotal y total round2', () => {
    const p = armarPropuestaVenta([coca])
    assert.equal(p.items[0].subtotal, 15000)
    assert.equal(p.total, 15000)
    assert.equal(p.recibido, undefined)
    assert.equal(p.vuelto, undefined)
  })

  it('multi-ítem con peso: redondea por línea como registrarVenta', () => {
    const p = armarPropuestaVenta([coca, paleta, aceite])
    // 0.359 * 9000 = 3231
    assert.equal(p.items[1].subtotal, 3231)
    assert.equal(p.total, 15000 + 3231 + 4200)
  })

  it('vuelto con redondeo $100 activo: solo múltiplos de 100', () => {
    const p = armarPropuestaVenta([coca, paleta, aceite], { recibido: 25000 })
    // total 22431, exceso 2569 → vuelto 2500, quedan 69 en caja
    assert.equal(p.total, 22431)
    assert.equal(p.vuelto, 2500)
    assert.equal(p.ajusteRedondeo, 69)
    assert.equal(p.faltante, undefined)
  })

  it('vuelto sin redondeo: exceso exacto', () => {
    const p = armarPropuestaVenta([coca, paleta, aceite], {
      recibido: 25000,
      redondeoActivo: false,
    })
    assert.equal(p.vuelto, 2569)
    assert.equal(p.ajusteRedondeo, 0)
  })

  it('recibido insuficiente: marca faltante y no calcula vuelto', () => {
    const p = armarPropuestaVenta([coca], { recibido: 10000 })
    assert.equal(p.faltante, 5000)
    assert.equal(p.vuelto, undefined)
  })

  it('recibido exacto: vuelto 0', () => {
    const p = armarPropuestaVenta([coca], { recibido: 15000 })
    assert.equal(p.vuelto, 0)
    assert.equal(p.ajusteRedondeo, 0)
  })

  it('rechaza cantidad y precio inválidos', () => {
    assert.throws(() => armarPropuestaVenta([{ ...coca, cantidad: 0 }]))
    assert.throws(() => armarPropuestaVenta([{ ...coca, precio_unitario: -1 }]))
    assert.throws(() => armarPropuestaVenta([]))
  })

  it('guarda cliente si se indica', () => {
    const p = armarPropuestaVenta([coca], { cliente_id: 'c1', cliente_nombre: 'Juan' })
    assert.equal(p.cliente_id, 'c1')
    assert.equal(p.cliente_nombre, 'Juan')
  })
})

describe('resumenPropuestaVenta', () => {
  it('incluye total y vuelto', () => {
    const p = armarPropuestaVenta([coca], { recibido: 20000 })
    const r = resumenPropuestaVenta(p)
    assert.ok(r.includes('Total $15000'))
    assert.ok(r.includes('vuelto $5000'))
  })

  it('avisa faltante', () => {
    const p = armarPropuestaVenta([coca], { recibido: 10000 })
    assert.ok(resumenPropuestaVenta(p).includes('FALTAN $5000'))
  })
})
