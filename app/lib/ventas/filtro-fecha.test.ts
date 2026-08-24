import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { esYmd, ymdFiltroListadoVentas } from './filtro-fecha.ts'

describe('esYmd', () => {
  it('acepta YYYY-MM-DD', () => {
    assert.equal(esYmd('2026-08-20'), true)
    assert.equal(esYmd('20/08/2026'), false)
    assert.equal(esYmd(''), false)
  })
})

describe('ymdFiltroListadoVentas', () => {
  const hoy = '2026-08-24'

  it('la fecha gana aunque haya búsqueda', () => {
    assert.equal(
      ymdFiltroListadoVentas({
        fecha: '2026-08-10',
        query: '42',
        forzarHoy: true,
        hoyYmd: hoy,
      }),
      '2026-08-10'
    )
  })

  it('búsqueda sin fecha no recorta a hoy', () => {
    assert.equal(
      ymdFiltroListadoVentas({
        query: 'T-0042',
        forzarHoy: true,
        hoyYmd: hoy,
      }),
      null
    )
  })

  it('sin búsqueda y forzarHoy usa hoy', () => {
    assert.equal(
      ymdFiltroListadoVentas({ forzarHoy: true, hoyYmd: hoy }),
      hoy
    )
  })

  it('sin búsqueda ni forzarHoy no filtra', () => {
    assert.equal(
      ymdFiltroListadoVentas({ forzarHoy: false, hoyYmd: hoy }),
      null
    )
  })
})
