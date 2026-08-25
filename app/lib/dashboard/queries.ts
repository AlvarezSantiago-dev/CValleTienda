import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'
import { inicioDiaArgentina, inicioDiaSiguienteArgentina } from '@/lib/datetime'
import { listarVentas, type VentaListItem } from '@/lib/ventas/queries'
import {
  listarDevoluciones,
  type DevolucionListItem,
} from '@/lib/devoluciones/queries'
import { listarCuentasFondos, type CuentaFondo } from '@/lib/configuracion/queries'
import { listarPendientesAcreditacion, posicionDeCuenta } from '@/lib/fondos/queries'
import type { PendienteItem, PosicionCuenta } from '@/lib/fondos/posicion'
import {
  mapDashboardGanancia,
  mapDashboardInicio,
  mapDashboardTops,
  mapGananciaBruta,
  type DashboardInicio,
  type DashboardTops,
} from './map-inicio'
export { obtenerTotalPorCobrar, type PorCobrarResumen } from '@/lib/cc/queries'
export type { DashboardInicio, DashboardTops }

export interface KpiPeriodo {
  cantidad: number
  monto: number
}

export interface KpisDia {
  hoy: KpiPeriodo
  ayer: KpiPeriodo
  devolucionesHoy: KpiPeriodo
  ticketPromedioHoy: number
  netoHoy: number
  deltaCantidadPct: number | null
  deltaMontoPct: number | null
}

export interface KpisMes {
  mesActual: KpiPeriodo
  mesAnterior: KpiPeriodo // hasta misma fecha del día actual
  devolucionesMes: KpiPeriodo
  netoMes: number
  deltaCantidadPct: number | null
  deltaMontoPct: number | null
}

export interface PuntoSerie {
  fecha: string // YYYY-MM-DD
  monto: number
  cantidad: number
}

export interface TopProductoItem {
  nombre: string
  unidades: number
  monto: number
}

export interface TopClienteItem {
  id: string
  nombre_completo: string
  total_compras: number
  monto_total: number
}

export interface SaldoCuentaPendienteDetalle extends PendienteItem {
  cuentaFondoId: string
  cuentaNombre: string
}

export interface SaldoCuentaDashboard extends CuentaFondo, PosicionCuenta {
  pendientes: SaldoCuentaPendienteDetalle[]
}

export interface TopVar1Item {
  valor: string
  unidades: number
  monto: number
}

export interface GananciaBrutaMes {
  ganancia: number
  costoTotal: number
  ventasNetas: number
  margenPct: number | null
  tieneData: boolean
  totalEgresos: number
  totalComisiones: number
  resultadoNeto: number
  tickets: number
  ventasBrutas: number
  creditoUsado: number
  cobrado: number
  devoluciones: number
}

export interface GananciaAlDia {
  hoy: GananciaBrutaMes
  mes: GananciaBrutaMes
}

const getCtx = cache(async () => {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('No autenticado')
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!perfil) throw new Error('Perfil no encontrado')
  return { supabase, tiendaId: perfil.tienda_id as string }
})

export const obtenerDashboardInicio = cache(async (): Promise<DashboardInicio> => {
  try {
    const { supabase, tiendaId } = await getCtx()
    const { data, error } = await supabase.rpc('get_dashboard_inicio', {
      p_tienda_id: tiendaId,
    })
    if (error) {
      console.error('get_dashboard_inicio', error)
      return mapDashboardInicio({})
    }
    return mapDashboardInicio(data)
  } catch (err) {
    console.error('get_dashboard_inicio', err)
    return mapDashboardInicio({})
  }
})

export const obtenerDashboardGanancia = cache(async (): Promise<GananciaAlDia> => {
  try {
    const { supabase, tiendaId } = await getCtx()
    const { data, error } = await supabase.rpc('get_dashboard_ganancia', {
      p_tienda_id: tiendaId,
    })
    if (error) {
      console.error('get_dashboard_ganancia', error)
      return mapDashboardGanancia({})
    }
    return mapDashboardGanancia(data)
  } catch (err) {
    console.error('get_dashboard_ganancia', err)
    return mapDashboardGanancia({})
  }
})

export const obtenerDashboardTops = cache(async (limit = 5): Promise<DashboardTops> => {
  try {
    const { supabase, tiendaId } = await getCtx()
    const { data, error } = await supabase.rpc('get_dashboard_tops', {
      p_tienda_id: tiendaId,
      p_limit: limit,
    })
    if (error) {
      console.error('get_dashboard_tops', error)
      return mapDashboardTops({})
    }
    return mapDashboardTops(data)
  } catch (err) {
    console.error('get_dashboard_tops', err)
    return mapDashboardTops({})
  }
})

export async function obtenerKpisDia(): Promise<KpisDia> {
  return (await obtenerDashboardInicio()).kpisDia
}

export async function obtenerKpisMes(): Promise<KpisMes> {
  return (await obtenerDashboardInicio()).kpisMes
}

export async function obtenerSerieVentas14Dias(): Promise<PuntoSerie[]> {
  return (await obtenerDashboardInicio()).serie
}

export async function obtenerStockBajoCount(): Promise<number> {
  return (await obtenerDashboardInicio()).stockBajo
}

export async function obtenerTopProductosMes(limit = 5): Promise<TopProductoItem[]> {
  return (await obtenerDashboardTops(limit)).productos
}

export async function obtenerTopVar1Mes(limit = 5): Promise<TopVar1Item[]> {
  return (await obtenerDashboardTops(limit)).var1
}

export async function obtenerGananciaAlDia(): Promise<GananciaAlDia> {
  return obtenerDashboardGanancia()
}

export async function obtenerGananciaDia(ymd: string): Promise<GananciaBrutaMes> {
  const inicio = inicioDiaArgentina(ymd)
  const fin = inicioDiaSiguienteArgentina(ymd)
  try {
    const { supabase, tiendaId } = await getCtx()
    const { data, error } = await supabase.rpc('get_ganancia_periodo', {
      p_tienda_id: tiendaId,
      p_inicio: inicio,
      p_fin: fin,
    })
    if (error) {
      console.error('get_ganancia_periodo', error)
      return obtenerGananciaDiaFallback(supabase, tiendaId, inicio, fin)
    }

    const mapped = mapGananciaBruta(data)
    const raw = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
    if (raw.ventas_brutas != null || raw.tickets != null) return mapped

    const ingresos = await obtenerIngresosDia(supabase, tiendaId, inicio, fin)
    return { ...mapped, ...ingresos }
  } catch (err) {
    console.error('get_ganancia_periodo', err)
    return mapGananciaBruta({})
  }
}

async function obtenerIngresosDia(
  supabase: Awaited<ReturnType<typeof getCtx>>['supabase'],
  tiendaId: string,
  inicio: string,
  fin: string
): Promise<Pick<GananciaBrutaMes, 'tickets' | 'ventasBrutas' | 'creditoUsado' | 'cobrado' | 'devoluciones'>> {
  const [{ data: ventas }, { data: devs }] = await Promise.all([
    supabase
      .from('ventas')
      .select('total, saldo_favor_usado')
      .eq('tienda_id', tiendaId)
      .eq('estado', 'completada')
      .gte('created_at', inicio)
      .lt('created_at', fin),
    supabase
      .from('devoluciones')
      .select('total_devuelto')
      .eq('tienda_id', tiendaId)
      .eq('estado', 'completada')
      .or('tipo_resolucion.is.null,tipo_resolucion.neq.cambio')
      .gte('created_at', inicio)
      .lt('created_at', fin),
  ])

  const tickets = ventas?.length ?? 0
  const ventasBrutas =
    Math.round((ventas ?? []).reduce((acc, r) => acc + Number(r.total ?? 0), 0) * 100) / 100
  const creditoUsado =
    Math.round(
      (ventas ?? []).reduce((acc, r) => acc + Number(r.saldo_favor_usado ?? 0), 0) * 100
    ) / 100
  const devoluciones =
    Math.round((devs ?? []).reduce((acc, r) => acc + Number(r.total_devuelto ?? 0), 0) * 100) /
    100

  return {
    tickets,
    ventasBrutas,
    creditoUsado,
    cobrado: Math.round((ventasBrutas - creditoUsado) * 100) / 100,
    devoluciones,
  }
}

async function obtenerGananciaDiaFallback(
  supabase: Awaited<ReturnType<typeof getCtx>>['supabase'],
  tiendaId: string,
  inicio: string,
  fin: string
): Promise<GananciaBrutaMes> {
  const [{ data: bruto }, { data: egresos }, { data: pagos }, ingresos] = await Promise.all([
    supabase.rpc('get_ganancia_bruta_mes', {
      p_tienda_id: tiendaId,
      p_inicio_mes: inicio,
      p_fin_mes: fin,
    }),
    supabase
      .from('movimientos_fondos')
      .select('monto')
      .eq('tienda_id', tiendaId)
      .eq('tipo', 'egreso')
      .is('venta_id', null)
      .gte('created_at', inicio)
      .lt('created_at', fin),
    supabase
      .from('pagos_venta')
      .select('comision_calculada, ventas!inner(estado)')
      .eq('tienda_id', tiendaId)
      .gte('created_at', inicio)
      .lt('created_at', fin),
    obtenerIngresosDia(supabase, tiendaId, inicio, fin),
  ])

  const row = Array.isArray(bruto) ? bruto[0] : bruto
  const totalEgresos = (egresos ?? []).reduce((acc, r) => acc + Number(r.monto ?? 0), 0)
  const totalComisiones = (pagos ?? []).reduce((acc, r) => {
    const venta = Array.isArray(r.ventas) ? r.ventas[0] : r.ventas
    if (venta && (venta as { estado?: string }).estado !== 'completada') return acc
    return acc + Number(r.comision_calculada ?? 0)
  }, 0)

  return mapGananciaBruta({
    ganancia: row?.ganancia ?? 0,
    costo_total: row?.costo_total ?? 0,
    ventas_netas: row?.ventas_netas ?? 0,
    tiene_data: row?.tiene_data ?? false,
    total_egresos: totalEgresos,
    total_comisiones: totalComisiones,
    tickets: ingresos.tickets,
    ventas_brutas: ingresos.ventasBrutas,
    credito_usado: ingresos.creditoUsado,
    cobrado: ingresos.cobrado,
    devoluciones: ingresos.devoluciones,
  })
}

export async function obtenerGananciaBrutaMes(): Promise<GananciaBrutaMes> {
  return (await obtenerDashboardGanancia()).mes
}

export async function obtenerTopClientesHistorico(limit = 5): Promise<TopClienteItem[]> {
  const { supabase, tiendaId } = await getCtx()
  const { data } = await supabase
    .from('clientes')
    .select('id, nombre, apellido, total_compras, monto_total')
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .gt('total_compras', 0)
    .order('monto_total', { ascending: false })
    .limit(limit)

  const rows = (data ?? []) as Array<{
    id: string
    nombre: string | null
    apellido: string | null
    total_compras: number | string
    monto_total: number | string
  }>

  return rows.map((r) => ({
    id: r.id,
    nombre_completo:
      `${r.nombre ?? ''} ${r.apellido ?? ''}`.trim() || 'Sin nombre',
    total_compras: Number(r.total_compras),
    monto_total: Number(r.monto_total),
  }))
}

export async function obtenerUltimasVentas(limit = 5): Promise<{
  ventas: VentaListItem[]
  prefijo_ticket: string
}> {
  const { ventas, prefijo_ticket } = await listarVentas({ pageSize: limit, page: 1, soloHoy: true })
  return { ventas, prefijo_ticket }
}

export async function obtenerUltimasDevoluciones(
  limit = 5
): Promise<DevolucionListItem[]> {
  const { items } = await listarDevoluciones({ pageSize: limit, page: 1 })
  return items
}

export async function obtenerSaldosCuentas(soloActivas = true): Promise<SaldoCuentaDashboard[]> {
  const { supabase, tiendaId } = await getCtx()
  const cuentas = await listarCuentasFondos(soloActivas)
  if (cuentas.length === 0) return []

  const pendientesPorCuenta = await listarPendientesAcreditacion({ supabase, tiendaId })

  return cuentas.map((c) => {
    const pos = posicionDeCuenta(c, pendientesPorCuenta)
    return {
      ...pos,
      pendientes: pos.pendientes.map((item) => ({
        ...item,
        cuentaFondoId: c.id,
        cuentaNombre: c.nombre,
      })),
    }
  })
}
