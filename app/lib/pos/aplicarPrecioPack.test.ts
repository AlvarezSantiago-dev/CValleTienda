import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { aplicarPrecioPack, resolverIdChip, type ItemConPack } from './aplicarPrecioPack.ts'

function item(partial: Partial<ItemConPack> & Pick<ItemConPack, 'cantidad'>): ItemConPack {
  return {
    id: 'v1',
    variante_id: 'v1',
    precio_unitario: 1000,
    stock_actual: 20,
    codigo_barras: 'unit',
    es_pack: false,
    pack_habilitado: true,
    pack_cantidad: 6,
    pack_precio: 5000,
    pack_codigo_barras: 'pack',
    pack_automatico: false,
    precio_unidad_original: 1000,
    codigo_unidad: 'unit',
    stock_fisico: 20,
    ...partial,
  }
}

describe('aplicarPrecioPack', () => {
  it('convierte 6 unidades en 1 pack', () => {
    const result = aplicarPrecioPack([item({ cantidad: 6 })])
    assert.equal(result.length, 1)
    assert.equal(result[0].id, 'v1__pack_auto')
    assert.equal(result[0].cantidad, 1)
    assert.equal(result[0].precio_unitario, 5000)
  })

  it('deja remanente unitario con 7 unidades', () => {
    const result = aplicarPrecioPack([item({ cantidad: 7 })])
    assert.equal(result.length, 2)
    assert.equal(result[0].cantidad, 1)
    assert.equal(result[0].precio_unitario, 5000)
    assert.equal(result[1].cantidad, 1)
    assert.equal(result[1].precio_unitario, 1000)
  })

  it('no altera packs escaneados explícitamente', () => {
    const explicit = item({
      id: 'v1__pack',
      cantidad: 1,
      precio_unitario: 5000,
      es_pack: true,
      pack_automatico: false,
      codigo_barras: 'pack',
      stock_actual: 3,
    })
    const result = aplicarPrecioPack([explicit, item({ cantidad: 6 })])
    assert.equal(result.length, 2)
    assert.ok(result.some((x) => x.id === 'v1__pack' && x.cantidad === 1))
    assert.ok(result.some((x) => x.id === 'v1__pack_auto' && x.cantidad === 1))
  })
})

describe('resolverIdChip', () => {
  it('prioriza remanente unitario sobre pack automático', () => {
    const items = aplicarPrecioPack([item({ cantidad: 7 })])
    assert.equal(resolverIdChip(items, 'v1'), 'v1')
  })

  it('usa pack automático cuando no hay remanente', () => {
    const items = aplicarPrecioPack([item({ cantidad: 6 })])
    assert.equal(resolverIdChip(items, 'v1'), 'v1__pack_auto')
  })
})
