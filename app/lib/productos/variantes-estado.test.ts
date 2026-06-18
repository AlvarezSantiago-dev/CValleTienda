import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calcularResumenVariantes,
  indicePrimeraSinCodigo,
  labelVariante,
} from './variantes-estado'
import type { VarianteInput } from '@/app/actions/productos'

const base = (): VarianteInput => ({
  talla_id: null,
  color_id: null,
  codigo_barras: null,
  precio_venta: null,
  stock_inicial: 0,
  stock_minimo: 0,
})

function doceVariantes(): VarianteInput[] {
  return Array.from({ length: 12 }, (_, i) => ({
    ...base(),
    talla_id: `t${i}`,
    codigo_barras: i < 10 ? `20000000000${i}` : null,
    stock_inicial: i < 8 ? 5 : 0,
  }))
}

describe('calcularResumenVariantes', () => {
  it('cuenta sin código y sin stock en modo carga', () => {
    const variantes = doceVariantes()
    const res = calcularResumenVariantes(variantes, { modoEdicion: false })

    assert.equal(res.total, 12)
    assert.equal(res.conCodigo, 10)
    assert.equal(res.sinCodigo, 2)
    assert.equal(res.conStock, 8)
    assert.equal(res.sinStock, 4)
    assert.equal(res.completas, 8)
    assert.equal(res.porcentajeListo, 67)
  })

  it('encuentra primera fila incompleta (sin código)', () => {
    const variantes = doceVariantes()
    const res = calcularResumenVariantes(variantes, { modoEdicion: false })
    assert.equal(res.primeraIncompletaIdx, 8)
    assert.equal(indicePrimeraSinCodigo(variantes), 10)
  })

  it('en modo edición no exige stock positivo', () => {
    const variantes = doceVariantes()
    const res = calcularResumenVariantes(variantes, { modoEdicion: true })

    assert.equal(res.sinStock, 0)
    assert.equal(res.completas, 10)
    assert.equal(res.porcentajeListo, 83)
  })

  it('ignora variantes eliminadas', () => {
    const variantes = [
      { ...base(), codigo_barras: '123', stock_inicial: 1 },
      { ...base(), eliminar: true, codigo_barras: null, stock_inicial: 0 },
    ]
    const res = calcularResumenVariantes(variantes, { modoEdicion: false })
    assert.equal(res.total, 1)
    assert.equal(res.completas, 1)
  })
})

describe('labelVariante', () => {
  it('une talla y color', () => {
    const label = labelVariante(
      { ...base(), talla_id: 't1', color_id: 'c1' },
      [{ id: 't1', nombre: 'M', tienda_id: '', orden: 0, activo: true, created_at: '' }],
      [{ id: 'c1', nombre: 'Negro', tienda_id: '', hex_color: null, activo: true, created_at: '' }],
      { var1: 'Talla', var2: 'Color', usarVar2: true }
    )
    assert.equal(label, 'M · Negro')
  })
})
