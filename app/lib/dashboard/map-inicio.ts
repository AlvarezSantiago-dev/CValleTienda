import type {
  GananciaAlDia,
  GananciaBrutaMes,
  KpiPeriodo,
  KpisDia,
  KpisMes,
  PuntoSerie,
  TopProductoItem,
  TopVar1Item,
} from './queries'

type PorCobrarResumen = { total: number; clientes: number }

export interface DashboardInicio {
  kpisDia: KpisDia
  kpisMes: KpisMes
  serie: PuntoSerie[]
  porCobrar: PorCobrarResumen
  stockBajo: number
}

export interface DashboardTops {
  productos: TopProductoItem[]
  var1: TopVar1Item[]
}

function num(value: unknown): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

function pct(actual: number, anterior: number): number | null {
  if (anterior === 0) return null
  return Math.round(((actual - anterior) / anterior) * 1000) / 10
}

function asPeriodo(raw: unknown): KpiPeriodo {
  const row = (raw ?? {}) as Record<string, unknown>
  return { cantidad: num(row.cantidad), monto: num(row.monto) }
}

function asObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
}

export function mapGananciaBruta(raw: unknown): GananciaBrutaMes {
  const row = asObj(raw)
  const ganancia = Math.round(num(row.ganancia) * 100) / 100
  const costoTotal = Math.round(num(row.costo_total) * 100) / 100
  const ventasNetas = Math.round(num(row.ventas_netas) * 100) / 100
  const tieneData = Boolean(row.tiene_data)
  const totalEgresos = Math.round(num(row.total_egresos) * 100) / 100
  const totalComisiones = Math.round(num(row.total_comisiones) * 100) / 100
  const tickets = Math.round(num(row.tickets))
  const ventasBrutas = Math.round(num(row.ventas_brutas) * 100) / 100
  const creditoUsado = Math.round(num(row.credito_usado) * 100) / 100
  const devoluciones = Math.round(num(row.devoluciones) * 100) / 100
  const cobradoRaw = row.cobrado
  const cobrado =
    cobradoRaw == null
      ? Math.round((ventasBrutas - creditoUsado) * 100) / 100
      : Math.round(num(cobradoRaw) * 100) / 100
  return {
    ganancia,
    costoTotal,
    ventasNetas,
    margenPct:
      ventasNetas > 0 && tieneData
        ? Math.round((ganancia / ventasNetas) * 1000) / 10
        : null,
    tieneData,
    totalEgresos,
    totalComisiones,
    resultadoNeto: Math.round((ganancia - totalEgresos - totalComisiones) * 100) / 100,
    tickets,
    ventasBrutas,
    creditoUsado,
    cobrado,
    devoluciones,
  }
}

export function mapDashboardInicio(raw: unknown): DashboardInicio {
  const row = asObj(raw)
  const hoy = asPeriodo(row.hoy)
  const ayer = asPeriodo(row.ayer)
  const mes = asPeriodo(row.mes)
  const mesAnt = asPeriodo(row.mes_ant)
  const devolucionesHoy = asPeriodo(row.devoluciones_hoy)
  const devolucionesMes = asPeriodo(row.devoluciones_mes)
  const porCobrarRaw = asObj(row.por_cobrar)

  const serieRaw = Array.isArray(row.serie) ? row.serie : []
  const serie: PuntoSerie[] = serieRaw.map((punto) => {
    const p = asObj(punto)
    return {
      fecha: String(p.fecha ?? ''),
      monto: num(p.monto),
      cantidad: num(p.cantidad),
    }
  })

  return {
    kpisDia: {
      hoy,
      ayer,
      devolucionesHoy,
      ticketPromedioHoy: hoy.cantidad > 0 ? hoy.monto / hoy.cantidad : 0,
      netoHoy: hoy.monto - devolucionesHoy.monto,
      deltaCantidadPct: pct(hoy.cantidad, ayer.cantidad),
      deltaMontoPct: pct(hoy.monto, ayer.monto),
    },
    kpisMes: {
      mesActual: mes,
      mesAnterior: mesAnt,
      devolucionesMes,
      netoMes: mes.monto - devolucionesMes.monto,
      deltaCantidadPct: pct(mes.cantidad, mesAnt.cantidad),
      deltaMontoPct: pct(mes.monto, mesAnt.monto),
    },
    serie,
    porCobrar: {
      total: num(porCobrarRaw.total),
      clientes: num(porCobrarRaw.clientes),
    },
    stockBajo: num(row.stock_bajo),
  }
}

export function mapDashboardGanancia(raw: unknown): GananciaAlDia {
  const row = asObj(raw)
  return {
    hoy: mapGananciaBruta(row.hoy),
    mes: mapGananciaBruta(row.mes),
  }
}

export function mapDashboardTops(raw: unknown): DashboardTops {
  const row = asObj(raw)
  const productosRaw = Array.isArray(row.productos) ? row.productos : []
  const var1Raw = Array.isArray(row.var1) ? row.var1 : []
  return {
    productos: productosRaw.map((item) => {
      const p = asObj(item)
      return {
        nombre: String(p.nombre ?? '—'),
        unidades: num(p.unidades),
        monto: num(p.monto),
      }
    }),
    var1: var1Raw.map((item) => {
      const p = asObj(item)
      return {
        valor: String(p.valor ?? '—'),
        unidades: num(p.unidades),
        monto: num(p.monto),
      }
    }),
  }
}
