import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  descuentoPctTramo,
  precioConTramo,
  qtyGrupoTramo,
  qtyParaTramo,
  textoDtoAplicado,
  validarTramos,
} from './tramos-cantidad.ts'

const COCA = [
  { cantidad_desde: 2, descuento_pct: 10 },
  { cantidad_desde: 10, descuento_pct: 20 },
]

describe('descuentoPctTramo', () => {
  it('sin tramos es 0', () => {
    assert.equal(descuentoPctTramo([], 10), 0)
  })

  it('qty 1 no entra al primer tramo', () => {
    assert.equal(descuentoPctTramo(COCA, 1), 0)
  })

  it('qty 2 usa 10 %', () => {
    assert.equal(descuentoPctTramo(COCA, 2), 10)
  })

  it('qty 10 usa 20 % (no apila)', () => {
    assert.equal(descuentoPctTramo(COCA, 10), 20)
  })
})

describe('precioConTramo', () => {
  it('Coca $10.000: 1 / 2 / 10 unidades', () => {
    assert.equal(precioConTramo(10000, COCA, 1), 10000)
    assert.equal(precioConTramo(10000, COCA, 2), 9000)
    assert.equal(precioConTramo(10000, COCA, 10), 8000)
  })

  it('sin tramos = lista', () => {
    assert.equal(precioConTramo(10000, [], 50), 10000)
  })

  it('monto resta pesos por presentación', () => {
    const t = [{ cantidad_desde: 2, descuento_pct: 0, tipo: 'monto' as const, descuento_monto: 500 }]
    assert.equal(precioConTramo(10430, t, 1), 10430)
    assert.equal(precioConTramo(10430, t, 2), 9930)
  })

  it('monto no baja de 0', () => {
    const t = [{ cantidad_desde: 1, descuento_pct: 0, tipo: 'monto' as const, descuento_monto: 99999 }]
    assert.equal(precioConTramo(100, t, 1), 0)
  })
})

describe('qtyGrupoTramo', () => {
  it('qty 1 + 1 variantes = tramo desde 2', () => {
    const items = [
      { productoId: 'p1', packId: null, cantidad: 1 },
      { productoId: 'p1', packId: null, cantidad: 1 },
    ]
    assert.equal(qtyParaTramo(items, items[0]), 2)
    assert.equal(precioConTramo(10430, [{ cantidad_desde: 2, descuento_pct: 5 }], 2), 9908.5)
  })

  it('no mezcla unidad con pack', () => {
    const items = [
      { productoId: 'p1', packId: null, cantidad: 2 },
      { productoId: 'p1', packId: 'pack8', cantidad: 2 },
    ]
    assert.equal(qtyGrupoTramo(items, 'p1', null), 2)
    assert.equal(qtyGrupoTramo(items, 'p1', 'pack8'), 2)
  })

  it('no mezcla sueltas con auto-pack sin packId', () => {
    const items = [
      { productoId: 'p1', packId: null, cantidad: 2, esPack: false },
      { productoId: 'p1', packId: null, cantidad: 2, esPack: true },
    ]
    assert.equal(qtyGrupoTramo(items, 'p1', null, false), 2)
    assert.equal(qtyGrupoTramo(items, 'p1', null, true), 2)
  })
})

describe('validarTramos', () => {
  it('acepta vacío', () => {
    const r = validarTramos([])
    assert.equal(r.ok, true)
  })

  it('rechaza cantidades duplicadas', () => {
    const r = validarTramos([
      { cantidad_desde: 2, descuento_pct: 10 },
      { cantidad_desde: 2, descuento_pct: 20 },
    ])
    assert.equal(r.ok, false)
  })

  it('acepta monto > 0', () => {
    const r = validarTramos([
      { cantidad_desde: 2, tipo: 'monto', descuento_pct: 0, descuento_monto: 500 },
    ])
    assert.equal(r.ok, true)
  })

  it('rechaza monto 0', () => {
    const r = validarTramos([
      { cantidad_desde: 2, tipo: 'monto', descuento_pct: 0, descuento_monto: 0 },
    ])
    assert.equal(r.ok, false)
  })
})

describe('textoDtoAplicado', () => {
  it('pct', () => {
    assert.equal(textoDtoAplicado(COCA, 2), 'Dto. −10 %')
  })

  it('monto', () => {
    assert.equal(
      textoDtoAplicado(
        [{ cantidad_desde: 2, tipo: 'monto', descuento_pct: 0, descuento_monto: 500 }],
        2
      ),
      'Dto. −$500'
    )
  })
})
