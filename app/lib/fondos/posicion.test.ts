import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  armarPosicion,
  estaPendiente,
  fechaAcreditacionIso,
  type PendienteItem,
} from './posicion'

const NETO_MP = 9601
const COMISION_MP = 399

function itemPendiente(overrides: Partial<PendienteItem> = {}): PendienteItem {
  return {
    pagoVentaId: 'pago-1',
    ventaId: 'venta-1',
    montoNeto: NETO_MP,
    comision: COMISION_MP,
    fechaVenta: '2026-08-15T15:00:00.000-03:00',
    fechaAcreditacion: '2026-08-16T03:00:00.000Z',
    ...overrides,
  }
}

describe('fechaAcreditacionIso', () => {
  it('suma días corridos en calendario ART (inicio de ese día)', () => {
    assert.equal(
      fechaAcreditacionIso('2026-08-15T15:00:00.000-03:00', 1),
      '2026-08-16T03:00:00.000Z'
    )
  })

  it('dias = 0 no desplaza la fecha', () => {
    const created = '2026-08-15T15:00:00.000-03:00'
    assert.equal(fechaAcreditacionIso(created, 0), created)
  })
})

describe('estaPendiente', () => {
  const acreditaMartes = fechaAcreditacionIso('2026-08-15T15:00:00.000-03:00', 1)

  it('sigue pendiente el mismo día de la venta (1 día de acreditación)', () => {
    assert.equal(estaPendiente(acreditaMartes, new Date('2026-08-15T18:00:00.000-03:00')), true)
  })

  it('deja de estar pendiente al iniciar el día ART de acreditación', () => {
    assert.equal(estaPendiente(acreditaMartes, new Date('2026-08-16T00:00:01.000-03:00')), false)
  })

  it('dias = 0 nunca queda pendiente si se evalúa contra created_at', () => {
    const created = '2026-08-15T15:00:00.000-03:00'
    assert.equal(estaPendiente(fechaAcreditacionIso(created, 0), new Date(created)), false)
  })
})

describe('armarPosicion', () => {
  it('venta MP $10.000 / 3,99 % / 1 día: al momento $0, por acreditar $9.601', () => {
    const pos = armarPosicion(NETO_MP, [itemPendiente()])
    assert.equal(pos.saldoProyectado, NETO_MP)
    assert.equal(pos.porAcreditar, NETO_MP)
    assert.equal(pos.saldoAlMomento, 0)
    assert.equal(pos.pendienteComision, COMISION_MP)
    assert.equal(pos.proximaFechaAcreditacion, '2026-08-16T03:00:00.000Z')
    assert.equal(pos.pendienteFechas, 1)
  })

  it('misma venta ya acreditada: al momento = proyectado', () => {
    const pos = armarPosicion(NETO_MP, [])
    assert.equal(pos.saldoAlMomento, NETO_MP)
    assert.equal(pos.porAcreditar, 0)
    assert.equal(pos.saldoProyectado, NETO_MP)
    assert.equal(pos.proximaFechaAcreditacion, null)
    assert.equal(pos.pendienteFechas, 0)
  })

  it('proximaFecha es la acreditación más cercana', () => {
    const pos = armarPosicion(15000, [
      itemPendiente({
        pagoVentaId: 'pago-lejos',
        fechaAcreditacion: '2026-08-20T03:00:00.000Z',
        montoNeto: 4000,
      }),
      itemPendiente({
        pagoVentaId: 'pago-cerca',
        fechaAcreditacion: '2026-08-16T03:00:00.000Z',
        montoNeto: 5000,
      }),
    ])
    assert.equal(pos.proximaFechaAcreditacion, '2026-08-16T03:00:00.000Z')
    assert.equal(pos.porAcreditar, 9000)
    assert.equal(pos.saldoAlMomento, 6000)
  })
})
