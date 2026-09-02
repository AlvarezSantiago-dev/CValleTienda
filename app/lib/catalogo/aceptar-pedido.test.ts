import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debeRemitoAlAceptar } from './aceptar-pedido.ts'

describe('debeRemitoAlAceptar', () => {
  it('distribuidora + plan remitos = sí', () => {
    assert.equal(debeRemitoAlAceptar('distribuidora', true), true)
  })

  it('distribuidora sin feature remitos = no', () => {
    assert.equal(debeRemitoAlAceptar('distribuidora', false), false)
  })

  it('ropa no emite remito al aceptar', () => {
    assert.equal(debeRemitoAlAceptar('ropa', true), false)
  })
})
