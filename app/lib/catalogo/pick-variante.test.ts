import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolverVariante, valoresEje2ParaEje1 } from './pick-variante.ts'

const vars = [
  { id: 'coca-comun', talla: 'Coca Cola', color: 'Común' },
  { id: 'coca-zero', talla: 'Coca Cola', color: 'Zero' },
  { id: 'sprite', talla: 'Sprite', color: 'Sprite' },
  { id: 'fanta', talla: 'Fanta', color: 'Fanta' },
]

describe('resolverVariante', () => {
  it('match exacto', () => {
    const hit = resolverVariante(vars, 'Coca Cola', 'Zero', 'color')
    assert.equal(hit?.id, 'coca-zero')
  })

  it('Coca Cola + Sprite inexistente cae a una Coca Cola', () => {
    const hit = resolverVariante(vars, 'Coca Cola', 'Sprite', 'talla')
    assert.ok(hit?.id.startsWith('coca-'))
    assert.equal(hit?.talla, 'Coca Cola')
  })

  it('click Color Sprite con talla Coca Cola elige Sprite', () => {
    const hit = resolverVariante(vars, 'Coca Cola', 'Sprite', 'color')
    assert.equal(hit?.id, 'sprite')
  })
})

describe('valoresEje2ParaEje1', () => {
  it('solo presentaciones de Coca Cola', () => {
    const colores = valoresEje2ParaEje1(vars, 'Coca Cola')
    assert.deepEqual(colores, ['Común', 'Zero'])
  })
})
