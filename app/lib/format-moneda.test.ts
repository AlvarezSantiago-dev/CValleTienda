import { describe, it, expect } from 'vitest'
import { parseARSInput, formatARSInput, sanitizeMoneyTyping } from './format-moneda'

describe('format-moneda', () => {
  it('parseARSInput formato AR con miles y decimales', () => {
    expect(parseARSInput('12.450,50')).toBe(12450.5)
  })

  it('parseARSInput entero simple', () => {
    expect(parseARSInput('1000')).toBe(1000)
  })

  it('parseARSInput vacío → 0', () => {
    expect(parseARSInput('')).toBe(0)
    expect(parseARSInput('   ')).toBe(0)
  })

  it('parseARSInput con símbolo $', () => {
    expect(parseARSInput('$ 1.000,00')).toBe(1000)
  })

  it('formatARSInput', () => {
    expect(formatARSInput(12450.5)).toBe('12.450,50')
    expect(formatARSInput(0)).toBe('')
  })

  it('sanitizeMoneyTyping quita caracteres inválidos', () => {
    expect(sanitizeMoneyTyping('abc12.450,50xyz')).toBe('12.450,50')
  })
})
