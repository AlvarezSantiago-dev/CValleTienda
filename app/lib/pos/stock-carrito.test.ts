import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { maxCantidadPos, puedeAgregarPos, stockFisicoValido } from './stock-carrito'

const unit = {
  id: 'u1',
  variante_id: 'v1',
  cantidad: 3,
  stock_actual: 10,
  stock_fisico: 10,
  es_pack: false,
  pack_cantidad: null as number | null,
}

const pack = {
  id: 'p1',
  variante_id: 'v1',
  cantidad: 1,
  stock_actual: 1,
  stock_fisico: 10,
  es_pack: true,
  pack_cantidad: 8,
}

describe('stock carrito POS', () => {
  it('bloquea unidad + pack que superan el físico', () => {
    assert.equal(stockFisicoValido([unit, pack], false), false)
    assert.equal(stockFisicoValido([{ ...unit, cantidad: 2 }, pack], false), true)
  })

  it('maxCantidadPos descuenta las otras líneas', () => {
    assert.equal(maxCantidadPos([unit, pack], pack.id, false), 0)
    assert.equal(maxCantidadPos([{ ...unit, cantidad: 2 }, pack], pack.id, false), 1)
    assert.equal(maxCantidadPos([unit, pack], unit.id, false), 2)
  })

  it('puedeAgregarPos no deja meter un pack si no alcanzan las unidades', () => {
    assert.equal(
      puedeAgregarPos(
        [unit],
        { varianteId: 'v1', cantidad: 1, packUnidades: 8, stockFisico: 10 },
        false
      ),
      false
    )
    assert.equal(
      puedeAgregarPos(
        [{ ...unit, cantidad: 2 }],
        { varianteId: 'v1', cantidad: 1, packUnidades: 8, stockFisico: 10 },
        false
      ),
      true
    )
  })
})
