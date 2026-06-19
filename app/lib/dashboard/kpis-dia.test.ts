import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ymdFromIso } from '@/lib/datetime'
import { bucketVentasPorDia } from './kpis-dia-buckets'

describe('ymdFromIso — límites de medianoche ART', () => {
  it('23:59 ART cuenta en el día anterior (UTC+3)', () => {
    // 2026-06-17 23:59 ART = 2026-06-18T02:59:00.000Z
    assert.equal(ymdFromIso('2026-06-18T02:59:00.000Z'), '2026-06-17')
  })

  it('00:01 ART cuenta en el día nuevo', () => {
    // 2026-06-18 00:01 ART = 2026-06-18T03:01:00.000Z
    assert.equal(ymdFromIso('2026-06-18T03:01:00.000Z'), '2026-06-18')
  })
})

describe('bucketVentasPorDia', () => {
  const hoyYmd = '2026-06-18'
  const ayerYmd = '2026-06-17'

  it('clasifica ventas en buckets hoy/ayer por calendario AR', () => {
    const ventas = [
      { total: 1000, created_at: '2026-06-18T15:00:00.000Z' }, // mediodía ART hoy
      { total: 2000, created_at: '2026-06-18T03:01:00.000Z' }, // 00:01 ART hoy
      { total: 500, created_at: '2026-06-18T02:59:00.000Z' }, // 23:59 ART ayer
      { total: 300, created_at: '2026-06-17T12:00:00.000Z' },
    ]

    const { hoy, ayer } = bucketVentasPorDia(ventas, hoyYmd, ayerYmd)

    assert.equal(hoy.cantidad, 2)
    assert.equal(hoy.monto, 3000)
    assert.equal(ayer.cantidad, 2)
    assert.equal(ayer.monto, 800)
  })

  it('doble turno mismo día: KPI suma ventas de ambas sesiones', () => {
    // Turno mañana (sesión 1): 20 ventas · $80.000
    const turnoManana = Array.from({ length: 20 }, (_, i) => ({
      total: 4000,
      created_at: `2026-06-18T${String(14 + Math.floor(i / 10)).padStart(2, '0')}:${String((i % 10) * 5).padStart(2, '0')}:00.000Z`,
    }))

    // Turno tarde (sesión 2): 12 ventas · $50.000
    const turnoTarde = [
      ...Array.from({ length: 11 }, () => ({
        total: 4166,
        created_at: '2026-06-18T20:00:00.000Z',
      })),
      { total: 4174, created_at: '2026-06-18T20:30:00.000Z' },
    ]

    const ventas = [...turnoManana, ...turnoTarde]
    const { hoy } = bucketVentasPorDia(ventas, hoyYmd, ayerYmd)

    assert.equal(hoy.cantidad, 32)
    assert.equal(hoy.monto, 130000)
  })

  it('venta de sesión individual no altera el bucket del día completo', () => {
    const ventasSesion1 = [
      { total: 10000, created_at: '2026-06-18T14:00:00.000Z' },
      { total: 20000, created_at: '2026-06-18T15:00:00.000Z' },
    ]
    const ventasSesion2 = [{ total: 50000, created_at: '2026-06-18T20:00:00.000Z' }]

    const totalDia = bucketVentasPorDia(
      [...ventasSesion1, ...ventasSesion2],
      hoyYmd,
      ayerYmd
    ).hoy
    const soloSesion1 = bucketVentasPorDia(ventasSesion1, hoyYmd, ayerYmd).hoy

    assert.equal(totalDia.cantidad, 3)
    assert.equal(totalDia.monto, 80000)
    assert.equal(soloSesion1.cantidad, 2)
    assert.equal(soloSesion1.monto, 30000)
  })
})
