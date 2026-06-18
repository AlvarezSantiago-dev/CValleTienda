import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computePadLeft,
  xLabelInterval,
  shouldShowXLabel,
  minChartWidth,
} from './chart-layout'

describe('computePadLeft', () => {
  it('crece con labels largos', () => {
    const short = computePadLeft(['$0', '$5k'])
    const long = computePadLeft(['$0', '$12.5M', '$25.0M'])
    assert.ok(long >= short)
  })
})

describe('xLabelInterval', () => {
  it('12 meses en slot estrecho salta labels', () => {
    assert.ok(xLabelInterval(12, 20) >= 2)
  })

  it('pocos puntos muestra todos', () => {
    assert.equal(xLabelInterval(3, 100), 1)
  })
})

describe('shouldShowXLabel', () => {
  it('siempre muestra el último', () => {
    assert.equal(shouldShowXLabel(11, 12, 3), true)
  })
})

describe('minChartWidth', () => {
  it('12 barras requiere más ancho', () => {
    assert.ok(minChartWidth(12) > minChartWidth(6))
  })
})
