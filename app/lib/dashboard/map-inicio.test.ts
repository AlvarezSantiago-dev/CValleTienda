import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mapDashboardGanancia, mapDashboardInicio, mapDashboardTops } from './map-inicio.ts'

describe('mapDashboardInicio', () => {
  it('arma KPIs, deltas y serie sin bajar filas crudas', () => {
    const mapped = mapDashboardInicio({
      hoy: { cantidad: 4, monto: 20000 },
      ayer: { cantidad: 2, monto: 10000 },
      mes: { cantidad: 10, monto: 50000 },
      mes_ant: { cantidad: 5, monto: 25000 },
      devoluciones_hoy: { cantidad: 1, monto: 1000 },
      devoluciones_mes: { cantidad: 2, monto: 3000 },
      serie: [{ fecha: '2026-08-08', cantidad: 1, monto: 500 }],
      por_cobrar: { total: 1200.5, clientes: 3 },
      stock_bajo: 7,
    })

    assert.equal(mapped.kpisDia.netoHoy, 19000)
    assert.equal(mapped.kpisDia.ticketPromedioHoy, 5000)
    assert.equal(mapped.kpisDia.deltaCantidadPct, 100)
    assert.equal(mapped.kpisMes.netoMes, 47000)
    assert.equal(mapped.kpisMes.deltaMontoPct, 100)
    assert.equal(mapped.serie[0]?.fecha, '2026-08-08')
    assert.equal(mapped.porCobrar.clientes, 3)
    assert.equal(mapped.stockBajo, 7)
  })

  it('delta es null si el período anterior está en cero', () => {
    const mapped = mapDashboardInicio({
      hoy: { cantidad: 1, monto: 100 },
      ayer: { cantidad: 0, monto: 0 },
      mes: { cantidad: 1, monto: 100 },
      mes_ant: { cantidad: 0, monto: 0 },
    })
    assert.equal(mapped.kpisDia.deltaMontoPct, null)
    assert.equal(mapped.kpisMes.deltaCantidadPct, null)
  })
})

describe('mapDashboardGanancia', () => {
  it('redondea resultado neto hoy y mes', () => {
    const mapped = mapDashboardGanancia({
      hoy: {
        ganancia: 100.126,
        costo_total: 40,
        ventas_netas: 200,
        tiene_data: true,
        total_egresos: 10.004,
        total_comisiones: 5.001,
      },
      mes: {
        ganancia: 0,
        costo_total: 0,
        ventas_netas: 0,
        tiene_data: false,
        total_egresos: 20,
        total_comisiones: 3,
      },
    })
    assert.equal(mapped.hoy.ganancia, 100.13)
    assert.equal(mapped.hoy.resultadoNeto, 85.13)
    assert.equal(mapped.hoy.margenPct, 50.1)
    assert.equal(mapped.hoy.ventasBrutas, 0)
    assert.equal(mapped.hoy.tickets, 0)
    assert.equal(mapped.mes.resultadoNeto, -23)
    assert.equal(mapped.mes.tieneData, false)
  })

  it('mapea ventas brutas, cobrado y devoluciones del día', () => {
    const mapped = mapDashboardGanancia({
      hoy: {
        ganancia: 40,
        costo_total: 60,
        ventas_netas: 100,
        tiene_data: true,
        total_egresos: 0,
        total_comisiones: 0,
        tickets: 3,
        ventas_brutas: 110.006,
        credito_usado: 10,
        devoluciones: 20,
      },
      mes: {},
    })
    assert.equal(mapped.hoy.tickets, 3)
    assert.equal(mapped.hoy.ventasBrutas, 110.01)
    assert.equal(mapped.hoy.creditoUsado, 10)
    assert.equal(mapped.hoy.cobrado, 100.01)
    assert.equal(mapped.hoy.devoluciones, 20)
  })
})

describe('mapDashboardTops', () => {
  it('mapea productos y var1', () => {
    const mapped = mapDashboardTops({
      productos: [{ nombre: 'Remera', unidades: 8, monto: 16000 }],
      var1: [{ valor: 'M', unidades: 3, monto: 6000 }],
    })
    assert.equal(mapped.productos[0]?.nombre, 'Remera')
    assert.equal(mapped.var1[0]?.valor, 'M')
  })
})
