import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatDateTime,
  formatDateLong,
  inicioDiaArgentina,
  inicioDiaSiguienteArgentina,
  ymdFromIso,
  addDaysYmd,
  hoyArgentinaYmd,
} from './datetime.ts'

describe('formatDateTime', () => {
  it('convierte UTC a hora Argentina (21:47 ART)', () => {
    const iso = '2026-06-18T00:47:00.000Z'
    const out = formatDateTime(iso)
    assert.match(out, /9:47/)
    assert.match(out, /17/)
  })
})

describe('formatDateLong', () => {
  it('muestra fecha larga en Argentina', () => {
    const out = formatDateLong('2026-06-18T00:47:00.000Z')
    assert.match(out, /junio/i)
    assert.match(out, /9:47/)
  })
})

describe('inicioDiaArgentina', () => {
  it('medianoche AR = 03:00 UTC', () => {
    assert.equal(inicioDiaArgentina('2026-06-17'), '2026-06-17T03:00:00.000Z')
  })
})

describe('inicioDiaSiguienteArgentina', () => {
  it('día siguiente a medianoche AR', () => {
    assert.equal(inicioDiaSiguienteArgentina('2026-06-17'), '2026-06-18T03:00:00.000Z')
  })
})

describe('ymdFromIso', () => {
  it('asigna venta nocturna al día AR correcto', () => {
    assert.equal(ymdFromIso('2026-06-18T00:47:00.000Z'), '2026-06-17')
  })
})

describe('addDaysYmd', () => {
  it('suma días en calendario', () => {
    assert.equal(addDaysYmd('2026-06-17', 1), '2026-06-18')
    assert.equal(addDaysYmd('2026-06-17', -1), '2026-06-16')
  })
})

describe('hoyArgentinaYmd', () => {
  it('retorna YYYY-MM-DD', () => {
    assert.match(hoyArgentinaYmd(), /^\d{4}-\d{2}-\d{2}$/)
  })
})
