import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { precioConTramo } from '../precios/tramos-cantidad.ts'
import {
  idVirtualPack,
  labelPack,
  parseIdVirtualPack,
  varianteIdDeEntrada,
} from './virtual.ts'

const VAR = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const PACK8 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const PACK24 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

describe('idVirtualPack / parseIdVirtualPack', () => {
  it('roundtrip', () => {
    const id = idVirtualPack(VAR, PACK8)
    assert.equal(parseIdVirtualPack(id)?.varianteId, VAR)
    assert.equal(parseIdVirtualPack(id)?.packId, PACK8)
  })

  it('no parsea pack legado ni auto', () => {
    assert.equal(parseIdVirtualPack(`${VAR}__pack`), null)
    assert.equal(parseIdVirtualPack(`${VAR}__pack_auto`), null)
  })
})

describe('varianteIdDeEntrada', () => {
  it('unidad, legado y pack N', () => {
    assert.equal(varianteIdDeEntrada(VAR), VAR)
    assert.equal(varianteIdDeEntrada(`${VAR}__pack`), VAR)
    assert.equal(varianteIdDeEntrada(`${VAR}__pack_auto`), VAR)
    assert.equal(varianteIdDeEntrada(idVirtualPack(VAR, PACK8)), VAR)
  })
})

describe('labelPack', () => {
  it('default y nombre custom', () => {
    assert.equal(labelPack(8), 'Pack x8')
    assert.equal(labelPack(24, 'Caja x24'), 'Caja x24')
  })
})

describe('tramos por pack no se mezclan', () => {
  const tramo8 = [{ cantidad_desde: 3, descuento_pct: 10 }]
  const tramo24 = [{ cantidad_desde: 20, descuento_pct: 15 }]

  it('3 packs x8 = −10 %; 2 packs x8 = lista', () => {
    assert.equal(precioConTramo(8000, tramo8, 2), 8000)
    assert.equal(precioConTramo(8000, tramo8, 3), 7200)
  })

  it('el tramo de x24 no aplica a 3 packs x8', () => {
    assert.equal(precioConTramo(20000, tramo24, 3), 20000)
    assert.equal(precioConTramo(20000, tramo24, 20), 17000)
    assert.notEqual(PACK8, PACK24)
  })
})
