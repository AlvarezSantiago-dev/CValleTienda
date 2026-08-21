import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { armarCombosVariantes, parsearListaNombres } from './variantes-producto'

describe('parsearListaNombres', () => {
  it('parte por coma y por "y"', () => {
    assert.deepEqual(parsearListaNombres('1.5, 2.25 y 3 litros'), ['1.5', '2.25', '3 litros'])
  })
  it('acepta array y deduplica', () => {
    assert.deepEqual(parsearListaNombres(['Coca', 'coca', 'Pepsi']), ['Coca', 'Pepsi'])
  })
})

describe('armarCombosVariantes', () => {
  it('sin listas: una variante única', () => {
    const c = armarCombosVariantes([], [])
    assert.equal(c.length, 1)
    assert.equal(c[0].var1, null)
    assert.equal(c[0].etiqueta, 'Única')
  })
  it('solo var1', () => {
    const c = armarCombosVariantes(['S', 'M'], [])
    assert.deepEqual(c.map((x) => x.etiqueta), ['S', 'M'])
  })
  it('cartesiano marca × presentación', () => {
    const c = armarCombosVariantes(['Coca Cola', 'Pepsi'], ['1.5 L', '3 L'])
    assert.equal(c.length, 4)
    assert.equal(c[0].etiqueta, 'Coca Cola · 1.5 L')
    assert.equal(c[3].etiqueta, 'Pepsi · 3 L')
  })
})
