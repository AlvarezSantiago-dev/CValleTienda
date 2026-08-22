import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'
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
