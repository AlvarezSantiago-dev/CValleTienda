import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseCantidadInput,
  round2,
  round3,
  sanitizeCantidadTyping,
} from './format-cantidad'

describe('parseCantidadInput', () => {
  it('acepta coma decimal AR', () => {
    assert.equal(parseCantidadInput('1,350'), 1.35)
    assert.equal(parseCantidadInput('0,235'), 0.235)
  })

  it('acepta punto como decimal (NO miles)', () => {
    assert.equal(parseCantidadInput('1.350'), 1.35)
    assert.notEqual(parseCantidadInput('1.350'), 1350)
  })

  it('enteros simples', () => {
    assert.equal(parseCantidadInput('350'), 350)
  })

  it('vacío e inválido → NaN', () => {
    assert.equal(Number.isNaN(parseCantidadInput('')), true)
    assert.equal(Number.isNaN(parseCantidadInput('   ')), true)
    assert.equal(Number.isNaN(parseCantidadInput('abc')), true)
  })

  it('si hay coma, puntos previos son miles', () => {
    assert.equal(parseCantidadInput('1.234,5'), 1234.5)
  })
})

describe('sanitizeCantidadTyping', () => {
  it('deja dígitos y un solo separador', () => {
    assert.equal(sanitizeCantidadTyping('1,35a0'), '1,350')
    assert.equal(sanitizeCantidadTyping('1.2.3'), '1.23')
  })
})

describe('round2 / round3', () => {
  it('round2 a centavos', () => {
    assert.equal(round2(10.1 * 0.333), 3.36)
  })

  it('round3 a milésimas', () => {
    assert.equal(round3(0.333 + 0.333), 0.666)
    assert.notEqual(round3(0.333 + 0.333), 0.67)
  })
})
