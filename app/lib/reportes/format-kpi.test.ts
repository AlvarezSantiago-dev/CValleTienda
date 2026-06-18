import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatARSKpi, formatARSAxis, shouldCompactKpi, kpiMonto } from './format-kpi'

describe('formatARSKpi', () => {
  it('formatea montos chicos sin compactar', () => {
    assert.ok(formatARSKpi(500).includes('500'))
  })

  it('compacta millones', () => {
    assert.match(formatARSKpi(1_500_000), /\$1[,.]5M/)
  })

  it('compacta montos muy grandes', () => {
    const s = formatARSKpi(12_345_678)
    assert.ok(s.length <= 10, `esperado compacto, got ${s}`)
    assert.match(s, /M/)
  })

  it('negativos con prefijo', () => {
    assert.match(formatARSKpi(-500_000), /−.*500k/)
  })
})

describe('formatARSAxis', () => {
  it('siempre compacto', () => {
    assert.match(formatARSAxis(2_500_000), /\$2[,.]5M/)
  })

  it('billones', () => {
    assert.match(formatARSAxis(1_200_000_000), /\$1[,.]2B/)
  })
})

describe('shouldCompactKpi', () => {
  it('false para montos cortos', () => {
    assert.equal(shouldCompactKpi(500), false)
  })

  it('true para montos largos', () => {
    assert.equal(shouldCompactKpi(12_345_678), true)
  })
})

describe('kpiMonto', () => {
  it('incluye valor y valorCompleto', () => {
    const r = kpiMonto(15_432_890)
    assert.ok(r.valor.length < r.valorCompleto.length)
    assert.match(r.valorCompleto, /15/)
  })
})
