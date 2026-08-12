import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { parsearCargaExpress, parseMontoAR, esTalleRopa, esColorBasura, parsearDatosProducto, parsearStockCeldas } from './parser-nl'
import { expandirVariantes, filtrarCeldasDraft, totalUnidades } from './expandir-variantes'
import { EJEMPLO_NEW_BALANCE } from './ejemplos'
import { validarDraft } from './tipos'

const catalogo = {
  colores: [
    { id: '1', nombre: 'Rojo' },
    { id: '2', nombre: 'Azul' },
    { id: '3', nombre: 'Verde' },
    { id: '4', nombre: 'Amarillo' },
  ],
  tallas: [
    { id: 'a', nombre: 'XS' },
    { id: 'b', nombre: 'M' },
    { id: 'c', nombre: 'XXL' },
    { id: 'd', nombre: 'S' },
    { id: 'e', nombre: 'L' },
    { id: 'f', nombre: 'XL' },
  ],
  categorias: [{ id: 'z', nombre: 'Zapatillas' }],
}

describe('parseMontoAR', () => {
  it('interpreta miles AR y enteros', () => {
    assert.equal(parseMontoAR('12.500'), 12500)
    assert.equal(parseMontoAR('6500'), 6500)
    assert.equal(parseMontoAR('12,50'), 12.5)
  })
})

describe('parsearCargaExpress', () => {
  it('parsea el ejemplo New Balance one-shot → celdas con talles', () => {
    const { draft, warnings, confidence } = parsearCargaExpress(EJEMPLO_NEW_BALANCE, catalogo)

    assert.equal(draft.nombre.trim(), 'Nuevas Prendas New Balance')
    assert.equal(draft.precioCompra, 25000)
    assert.equal(draft.precioVenta, 50000)
    assert.ok(draft.celdas.length >= 3)
    assert.ok(draft.colores.length >= 3)
    assert.equal(confidence, 'high')
    assert.equal(warnings.filter((w) => w.blocking).length, 0)
    assert.equal(validarDraft(draft), null)
  })

  it('parsea dictado real: un/dos, compras, 12.500, doble XL', () => {
    const texto =
      'crear producto con el nombre remera basica colores rojo azul amarillo verde un rojo xs un rojo m dos rojo XL un azul m un amarillo XL un verde doble XL compras 6500 venta 12.500'
    const { draft, warnings } = parsearCargaExpress(texto, catalogo)

    assert.equal(norm(draft.nombre), 'remera basica')
    assert.equal(draft.precioCompra, 6500)
    assert.equal(draft.precioVenta, 12500)
    assert.equal(draft.celdas.length, 6)
    assert.deepEqual(
      draft.celdas.map((c) => `${c.cantidad}|${norm(c.colorNombre)}|${c.tallaNombre}`).sort(),
      [
        '1|amarillo|XL',
        '1|azul|M',
        '1|rojo|M',
        '1|rojo|XS',
        '1|verde|XXL',
        '2|rojo|XL',
      ].sort()
    )
    assert.equal(warnings.filter((w) => w.blocking).length, 0)
    assert.equal(validarDraft(draft), null)
  })

  it('parsea stock solo por color sin talles (no come el número siguiente)', () => {
    const texto =
      'producto con el nombre nuevas prendas new balance colores rojo azul verde amarillo 3 rojos 2 azules 1 verde 4 amarillos 10 verdes 20 amarillos precio compra 25000 precio venta 50000'
    const { draft, warnings } = parsearCargaExpress(texto, catalogo)

    assert.equal(norm(draft.nombre), 'nuevas prendas new balance')
    assert.equal(draft.precioCompra, 25000)
    assert.equal(draft.precioVenta, 50000)
    // verde 1+10=11, amarillo 4+20=24
    assert.deepEqual(
      draft.celdas.map((c) => `${c.cantidad}|${norm(c.colorNombre)}|${c.tallaNombre}`).sort(),
      [
        '11|verde|Único',
        '2|azul|Único',
        '24|amarillo|Único',
        '3|rojo|Único',
      ].sort()
    )
    assert.ok(draft.celdas.some((c) => norm(c.colorNombre) === 'azul' && c.cantidad === 2))
    assert.equal(warnings.filter((w) => w.blocking).length, 0)
  })

  it('acepta orden distinto y sin comillas', () => {
    const texto =
      'Producto Remera NB. Precio venta 9900 compra 4000. Categoria remeras. 2 negros S, 1 azul L. Colores negro, azul.'
    const { draft } = parsearCargaExpress(texto, {
      ...catalogo,
      colores: [
        { id: '1', nombre: 'Negro' },
        { id: '2', nombre: 'Azul' },
      ],
      categorias: [{ id: 'r', nombre: 'Remeras' }],
    })

    assert.match(draft.nombre, /Remera Nb/i)
    assert.equal(draft.precioVenta, 9900)
    assert.equal(draft.precioCompra, 4000)
    assert.equal(draft.celdas.length, 2)
  })

  it('warning bloqueante si solo colores sin celdas', () => {
    const { draft, warnings } = parsearCargaExpress(
      'Producto Campera. Colores rojo, azul. Precio venta 10000.',
      catalogo
    )
    assert.equal(draft.celdas.length, 0)
    assert.ok(warnings.some((w) => w.code === 'sin_celdas' && w.blocking))
  })

  it('paso 1 solo datos y paso 2 solo stock', () => {
    const datos = parsearDatosProducto(
      'Producto Nuevas prendas New Balance. Colores rojo, azul, verde. Compra 25000 venta 50000.',
      catalogo
    )
    assert.equal(norm(datos.draft.nombre), 'nuevas prendas new balance')
    assert.equal(datos.draft.precioVenta, 50000)
    assert.equal(datos.draft.celdas.length, 0)
    assert.ok(datos.draft.colores.length >= 3)

    const stock = parsearStockCeldas(
      '3 rojos M, 2 azules XL, 1 verde S',
      datos.draft.colores.map((c) => c.nombre),
      catalogo
    )
    assert.equal(stock.draft.celdas.length, 3)
    assert.ok(stock.draft.celdas.some((c) => norm(c.colorNombre) === 'azul' && c.cantidad === 2))
  })

  it('marca talle nuevo si no está en catálogo', () => {
    const { warnings, draft } = parsearCargaExpress(
      'Producto X "Test". 1 rojo XXXXXL. Precio venta 1000. Colores rojo.',
      catalogo
    )
    assert.equal(draft.celdas.length, 1)
    assert.ok(warnings.some((w) => w.code === 'talle_nuevo'))
  })

  it('dictado libre: crea categoría/color/talle y entiende precio genérico', () => {
    const texto =
      'buzo de algodon color azul marca nike talle L XL XXL con el cuello redondo el precio es de 50000 pesos la categoria es invierno'
    const { draft, warnings } = parsearDatosProducto(texto, {
      colores: [{ id: '1', nombre: 'Rojo' }],
      tallas: [{ id: '1', nombre: 'M' }],
      categorias: [{ id: '1', nombre: 'Remeras' }],
    })
    assert.match(norm(draft.nombre), /buzo.*algodon.*nike/)
    assert.equal(draft.precioVenta, 50000)
    assert.equal(norm(draft.categoriaNombre ?? ''), 'invierno')
    assert.ok(draft.colores.some((c) => norm(c.nombre) === 'azul'))
    assert.ok(!draft.colores.some((c) => norm(c.nombre) === 'peso'))
    assert.deepEqual(draft.tallas.sort(), ['L', 'XL', 'XXL'].sort())
    assert.ok(warnings.some((w) => /Categoría/.test(w.message) && /creará/.test(w.message)))
    assert.ok(warnings.some((w) => /Color/.test(w.message) && /creará/.test(w.message)))

    const stock = parsearStockCeldas(
      'el stock es de azul en talle L 5 en talle XL 10 y en talle XXL 15 tambien hay stock de un color verde en talle L 2 unidades',
      draft.colores.map((c) => c.nombre),
      catalogo
    )
    assert.equal(stock.draft.celdas.length, 4)
    assert.ok(stock.draft.celdas.some((c) => norm(c.colorNombre) === 'verde' && c.cantidad === 2))
  })
})

describe('filtros ropa', () => {
  it('detecta talles ropa vs basura', () => {
    assert.equal(esTalleRopa('XS'), true)
    assert.equal(esTalleRopa('42'), true)
    assert.equal(esTalleRopa('Sancor'), false)
    assert.equal(esColorBasura('1kg'), true)
    assert.equal(esColorBasura('Rojo'), false)
  })
})

describe('expandirVariantes / filtrarCeldasDraft', () => {
  it('solo crea celdas con qty > 0 por default', () => {
    const celdas = [
      { colorNombre: 'Rojo', tallaNombre: 'XS', cantidad: 1 },
      { colorNombre: 'Rojo', tallaNombre: 'M', cantidad: 0 },
      { colorNombre: 'Azul', tallaNombre: 'XXL', cantidad: 3 },
    ]
    assert.equal(filtrarCeldasDraft(celdas).length, 2)
    assert.equal(totalUnidades(celdas), 4)

    const vars = expandirVariantes([
      { colorId: 'c1', tallaId: 't1', cantidad: 1 },
      { colorId: 'c1', tallaId: 't2', cantidad: 0 },
      { colorId: 'c2', tallaId: 't3', cantidad: 3 },
    ])
    assert.equal(vars.length, 2)
    assert.equal(vars[0].stock_inicial, 1)
    assert.equal(vars[1].stock_inicial, 3)
  })
})

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}
