import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'
import { listarVentas, type VentaListItem } from '@/lib/ventas/queries'
import {
  listarDevoluciones,
  type DevolucionListItem,
} from '@/lib/devoluciones/queries'
import { contarVariantesBajoStock } from '@/lib/stock/queries'
import { listarCuentasFondos, type CuentaFondo } from '@/lib/configuracion/queries'

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

export interface SaldoCuentaPendienteDetalle {
  pagoVentaId: string
  ventaId: string
  montoNeto: number
  comision: number
  fechaVenta: string | null
  fechaAcreditacion: string
  cuentaFondoId: string
  cuentaNombre: string
}

export interface SaldoCuentaDashboard extends CuentaFondo {
  saldoDisponibleEstimado: number
  pendientePorAcreditar: number
  pendienteComision: number
  proximaFechaAcreditacion: string | null
  pendienteFechas: number
  pendientes: SaldoCuentaPendienteDetalle[]
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

// getCtx cacheado por request: se ejecuta UNA sola vez aunque se llame 11 veces
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

// ---------- Helpers de fechas ----------

/** Devuelve YYYY-MM-DD a partir de un Date (zona local del servidor). */
function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Inicio del día (00:00:00) en ISO. */
function inicioDia(d: Date): string {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.toISOString()
}

/** Fin del día (siguiente 00:00:00) en ISO — usar con `<` para excluir. */
function inicioDiaSiguiente(d: Date): string {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() + 1)
  return x.toISOString()
}

function pct(actual: number, anterior: number): number | null {
  if (anterior === 0) return null
  return Math.round(((actual - anterior) / anterior) * 1000) / 10
}

// ---------- KPIs Día ----------

export async function obtenerKpisDia(): Promise<KpisDia> {
  const { supabase, tiendaId } = await getCtx()
  const hoy = new Date()
  const ayer = new Date(hoy)
  ayer.setDate(ayer.getDate() - 1)

  const desdeAyer = inicioDia(ayer)
  const hastaHoyMasUno = inicioDiaSiguiente(hoy)
  const desdeHoy = inicioDia(hoy)

  // Una sola query para ventas de los últimos 2 días, agrupamos en JS
  const { data: ventasRaw } = await supabase
    .from('ventas')
    .select('total, created_at')
    .eq('tienda_id', tiendaId)
    .eq('estado', 'completada')
    .gte('created_at', desdeAyer)
    .lt('created_at', hastaHoyMasUno)

  const ventas = (ventasRaw ?? []) as Array<{ total: number | string; created_at: string }>
  const hoyVentas: KpiPeriodo = { cantidad: 0, monto: 0 }
  const ayerVentas: KpiPeriodo = { cantidad: 0, monto: 0 }
  for (const v of ventas) {
    const t = Number(v.total)
    if (v.created_at >= desdeHoy) {
      hoyVentas.cantidad += 1
      hoyVentas.monto += t
    } else {
      ayerVentas.cantidad += 1
      ayerVentas.monto += t
    }
  }

  // Devoluciones de hoy — solo reembolsos (dinero que salió de las cuentas)
  const { data: devsRaw } = await supabase
    .from('devoluciones')
    .select('total_devuelto')
    .eq('tienda_id', tiendaId)
    .eq('estado', 'completada')
    .neq('tipo_resolucion', 'cambio')
    .gte('created_at', desdeHoy)
    .lt('created_at', hastaHoyMasUno)
  const devs = (devsRaw ?? []) as Array<{ total_devuelto: number | string }>
  const devolucionesHoy: KpiPeriodo = {
    cantidad: devs.length,
    monto: devs.reduce((acc, d) => acc + Number(d.total_devuelto), 0),
  }

  const ticketPromedioHoy =
    hoyVentas.cantidad > 0 ? hoyVentas.monto / hoyVentas.cantidad : 0
  const netoHoy = hoyVentas.monto - devolucionesHoy.monto

  return {
    hoy: hoyVentas,
    ayer: ayerVentas,
    devolucionesHoy,
    ticketPromedioHoy,
    netoHoy,
    deltaCantidadPct: pct(hoyVentas.cantidad, ayerVentas.cantidad),
    deltaMontoPct: pct(hoyVentas.monto, ayerVentas.monto),
  }
}

// ---------- KPIs Mes ----------

export async function obtenerKpisMes(): Promise<KpisMes> {
  const { supabase, tiendaId } = await getCtx()
  const ahora = new Date()
  const anioAct = ahora.getFullYear()
  const mesAct = ahora.getMonth() // 0-11
  const dia = ahora.getDate()

  const inicioMesActual = new Date(anioAct, mesAct, 1, 0, 0, 0, 0)
  const finMesActual = new Date(anioAct, mesAct, dia + 1, 0, 0, 0, 0) // hasta hoy +1 día

  const inicioMesAnterior = new Date(anioAct, mesAct - 1, 1, 0, 0, 0, 0)
  // Hasta el mismo día del mes anterior +1 (con clamping si el mes anterior es más corto)
  const finMesAnterior = new Date(anioAct, mesAct - 1, dia + 1, 0, 0, 0, 0)

  // Si el día clampea (ej. mes anterior tenía 28), Date lo ajusta solo. OK.

  const desdeMin = inicioMesAnterior.toISOString()
  const hastaMax = finMesActual.toISOString()
  const corteMesAct = inicioMesActual.toISOString()
  const corteMesAntFin = finMesAnterior.toISOString()

  const { data: ventasRaw } = await supabase
    .from('ventas')
    .select('total, created_at')
    .eq('tienda_id', tiendaId)
    .eq('estado', 'completada')
    .gte('created_at', desdeMin)
    .lt('created_at', hastaMax)

  const ventas = (ventasRaw ?? []) as Array<{ total: number | string; created_at: string }>
  const mesActualV: KpiPeriodo = { cantidad: 0, monto: 0 }
  const mesAnteriorV: KpiPeriodo = { cantidad: 0, monto: 0 }
  for (const v of ventas) {
    const t = Number(v.total)
    if (v.created_at >= corteMesAct) {
      mesActualV.cantidad += 1
      mesActualV.monto += t
    } else if (v.created_at < corteMesAntFin) {
      mesAnteriorV.cantidad += 1
      mesAnteriorV.monto += t
    }
    // Resto: posible gap entre finMesAnterior y inicioMesActual → ignoramos
  }

  // Devoluciones del mes actual — solo reembolsos (dinero que salió de las cuentas)
  const { data: devsRaw } = await supabase
    .from('devoluciones')
    .select('total_devuelto')
    .eq('tienda_id', tiendaId)
    .eq('estado', 'completada')
    .neq('tipo_resolucion', 'cambio')
    .gte('created_at', corteMesAct)
    .lt('created_at', hastaMax)
  const devs = (devsRaw ?? []) as Array<{ total_devuelto: number | string }>
  const devolucionesMes: KpiPeriodo = {
    cantidad: devs.length,
    monto: devs.reduce((acc, d) => acc + Number(d.total_devuelto), 0),
  }

  return {
    mesActual: mesActualV,
    mesAnterior: mesAnteriorV,
    devolucionesMes,
    netoMes: mesActualV.monto - devolucionesMes.monto,
    deltaCantidadPct: pct(mesActualV.cantidad, mesAnteriorV.cantidad),
    deltaMontoPct: pct(mesActualV.monto, mesAnteriorV.monto),
  }
}

// ---------- Serie 14 días ----------

export async function obtenerSerieVentas14Dias(): Promise<PuntoSerie[]> {
  const { supabase, tiendaId } = await getCtx()
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const desde = new Date(hoy)
  desde.setDate(desde.getDate() - 13) // 14 días incluyendo hoy

  const { data } = await supabase
    .from('ventas')
    .select('total, created_at')
    .eq('tienda_id', tiendaId)
    .eq('estado', 'completada')
    .gte('created_at', desde.toISOString())
    .lt('created_at', inicioDiaSiguiente(hoy))

  const ventas = (data ?? []) as Array<{ total: number | string; created_at: string }>

  // Agrupar por YYYY-MM-DD
  const map = new Map<string, { monto: number; cantidad: number }>()
  for (const v of ventas) {
    const key = ymd(new Date(v.created_at))
    const cur = map.get(key) ?? { monto: 0, cantidad: 0 }
    cur.monto += Number(v.total)
    cur.cantidad += 1
    map.set(key, cur)
  }

  const serie: PuntoSerie[] = []
  for (let i = 0; i < 14; i += 1) {
    const d = new Date(desde)
    d.setDate(d.getDate() + i)
    const key = ymd(d)
    const cur = map.get(key) ?? { monto: 0, cantidad: 0 }
    serie.push({ fecha: key, monto: cur.monto, cantidad: cur.cantidad })
  }
  return serie
}

// ---------- Top productos del mes ----------

export async function obtenerTopProductosMes(limit = 5): Promise<TopProductoItem[]> {
  const { supabase, tiendaId } = await getCtx()
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0)
  const finMes = inicioDiaSiguiente(ahora)

  // Trae detalles de ventas completadas del mes en curso
  const { data } = await supabase
    .from('detalles_venta')
    .select(
      'nombre_producto, cantidad, total_linea, venta:ventas!inner(estado, created_at)'
    )
    .eq('tienda_id', tiendaId)
    .gte('venta.created_at', inicioMes.toISOString())
    .lt('venta.created_at', finMes)
    .eq('venta.estado', 'completada')

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>
  const map = new Map<string, { unidades: number; monto: number }>()
  for (const r of rows) {
    // venta es array por PostgREST, basta con que exista
    const venta = Array.isArray(r.venta) ? r.venta[0] : r.venta
    if (!venta) continue
    const nombre = (r.nombre_producto as string) ?? '—'
    const cur = map.get(nombre) ?? { unidades: 0, monto: 0 }
    cur.unidades += Number(r.cantidad)
    cur.monto += Number(r.total_linea)
    map.set(nombre, cur)
  }

  return Array.from(map.entries())
    .map(([nombre, v]) => ({ nombre, unidades: v.unidades, monto: v.monto }))
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, limit)
}

// ---------- Top clientes histórico ----------

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

// ---------- Wrappers de reuso ----------

export async function obtenerUltimasVentas(limit = 5): Promise<{
  ventas: VentaListItem[]
  prefijo_ticket: string
}> {
  const { ventas, prefijo_ticket } = await listarVentas({ pageSize: limit, page: 1 })
  return { ventas, prefijo_ticket }
}

export async function obtenerUltimasDevoluciones(
  limit = 5
): Promise<DevolucionListItem[]> {
  const { items } = await listarDevoluciones({ pageSize: limit, page: 1 })
  return items
}

export async function obtenerStockBajoCount(): Promise<number> {
  return contarVariantesBajoStock()
}

export async function obtenerSaldosCuentas(): Promise<SaldoCuentaDashboard[]> {
  const { supabase, tiendaId } = await getCtx()
  const cuentas = await listarCuentasFondos(true)
  if (cuentas.length === 0) return []

  const { data: pagosRaw } = await supabase
    .from('pagos_venta')
    .select(
      'id, cuenta_fondo_id, monto_neto, comision_calculada, dias_acreditacion, created_at, venta:ventas!inner(id, total, created_at, estado)'
    )
    .eq('tienda_id', tiendaId)
    .eq('venta.estado', 'completada')
    .not('cuenta_fondo_id', 'is', null)

  const pagos = (pagosRaw ?? []) as Array<{
    id: string
    cuenta_fondo_id: string | null
    monto_neto: number | string
    comision_calculada: number | string
    dias_acreditacion: number | string
    created_at: string
    venta: Array<{ id: string; total: number | string; created_at: string }> | { id: string; total: number | string; created_at: string } | null
  }>

  const ahora = new Date()
  const pendingByCuenta = new Map<
    string,
    {
      pendiente: number
      comision: number
      proximaFecha: string | null
      fechas: number
      items: Array<{
        pagoVentaId: string
        ventaId: string
        montoNeto: number
        comision: number
        fechaVenta: string | null
        fechaAcreditacion: string
      }>
    }
  >()

  for (const pago of pagos) {
    if (!pago.cuenta_fondo_id) continue
    const dias = Number(pago.dias_acreditacion ?? 0)
    if (dias <= 0) continue

    const createdAt = new Date(pago.created_at)
    const fechaAcreditacion = new Date(createdAt)
    fechaAcreditacion.setDate(fechaAcreditacion.getDate() + dias)

    if (fechaAcreditacion <= ahora) continue

    const venta = Array.isArray(pago.venta) ? pago.venta[0] : pago.venta
    const fechaVenta = venta?.created_at ? new Date(venta.created_at).toISOString() : null

    const key = pago.cuenta_fondo_id
    const actual = pendingByCuenta.get(key) ?? {
      pendiente: 0,
      comision: 0,
      proximaFecha: null,
      fechas: 0,
      items: [],
    }
    actual.pendiente += Number(pago.monto_neto ?? 0)
    actual.comision += Number(pago.comision_calculada ?? 0)
    actual.fechas += 1
    actual.items.push({
      pagoVentaId: pago.id,
      ventaId: venta?.id ?? '—',
      montoNeto: Number(pago.monto_neto ?? 0),
      comision: Number(pago.comision_calculada ?? 0),
      fechaVenta,
      fechaAcreditacion: fechaAcreditacion.toISOString(),
    })

    const fechaIso = fechaAcreditacion.toISOString()
    if (!actual.proximaFecha || fechaIso < actual.proximaFecha) {
      actual.proximaFecha = fechaIso
    }
    pendingByCuenta.set(key, actual)
  }

  return cuentas.map((c) => {
    const pending = pendingByCuenta.get(c.id) ?? {
      pendiente: 0,
      comision: 0,
      proximaFecha: null,
      fechas: 0,
      items: [],
    }
    const saldoDisponibleEstimado = Math.max(0, round2(c.saldo_actual - pending.pendiente))

    return {
      ...c,
      saldoDisponibleEstimado,
      pendientePorAcreditar: round2(pending.pendiente),
      pendienteComision: round2(pending.comision),
      proximaFechaAcreditacion: pending.proximaFecha,
      pendienteFechas: pending.fechas ?? 0,
      pendientes: pending.items.map((item) => ({
        ...item,
        cuentaFondoId: c.id,
        cuentaNombre: c.nombre,
      })),
    }
  })
}

// ---------- Top variante 1 del mes (adaptado por rubro) ----------

export interface TopVar1Item {
  valor: string
  unidades: number
  monto: number
}

export async function obtenerTopVar1Mes(limit = 5): Promise<TopVar1Item[]> {
  const { supabase, tiendaId } = await getCtx()
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0)
  const finMes = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, 0, 0, 0, 0)

  const { data } = await supabase
    .from('detalles_venta')
    .select('talla, cantidad, total_linea, venta:ventas!inner(estado, created_at)')
    .eq('tienda_id', tiendaId)
    .not('talla', 'is', null)
    .gte('venta.created_at', inicioMes.toISOString())
    .lt('venta.created_at', finMes.toISOString())
    .eq('venta.estado', 'completada')

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>
  const map = new Map<string, { unidades: number; monto: number }>()
  for (const r of rows) {
    const venta = Array.isArray(r.venta) ? r.venta[0] : r.venta
    if (!venta) continue
    const valor = (r.talla as string) ?? '—'
    const cur = map.get(valor) ?? { unidades: 0, monto: 0 }
    cur.unidades += Number(r.cantidad)
    cur.monto += Number(r.total_linea)
    map.set(valor, cur)
  }

  return Array.from(map.entries())
    .map(([valor, v]) => ({ valor, unidades: v.unidades, monto: v.monto }))
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, limit)
}

// ---------- Ganancia bruta del mes ----------

export interface GananciaBrutaMes {
  ganancia: number         // suma (precio_unitario - costo_unitario) * cantidad
  costoTotal: number       // suma costo_unitario * cantidad
  ventasNetas: number      // suma total_linea (precio de venta)
  margenPct: number | null // ganancia / ventasNetas * 100
  tieneData: boolean       // false cuando todos los costos son 0 (sin cargar)
  totalEgresos: number     // sum(monto) de egresos manuales del mes
  totalComisiones: number  // comisiones de pagos del mes
  resultadoNeto: number    // ganancia - totalEgresos - totalComisiones
}

export async function obtenerGananciaBrutaMes(): Promise<GananciaBrutaMes> {
  const { supabase, tiendaId } = await getCtx()
  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0)
  const finMes = inicioDiaSiguiente(ahora)

  const [rpcResult, egresosResult] = await Promise.all([
    supabase.rpc('get_ganancia_bruta_mes', {
      p_tienda_id:  tiendaId,
      p_inicio_mes: inicioMes.toISOString(),
      p_fin_mes:    finMes,
    }),
    supabase
      .from('movimientos_fondos')
      .select('monto')
      .eq('tienda_id', tiendaId)
      .eq('tipo', 'egreso')
      .is('venta_id', null)
      .gte('created_at', inicioMes.toISOString())
      .lt('created_at', finMes),
  ])

  const totalEgresos = ((egresosResult.data ?? []) as Array<{ monto: number | string }>)
    .reduce((acc, r) => acc + Number(r.monto), 0)

  const { data: comisionesRaw } = await supabase
    .from('pagos_venta')
    .select('comision_calculada, venta:ventas!inner(estado)')
    .eq('tienda_id', tiendaId)
    .eq('venta.estado', 'completada')
    .gte('created_at', inicioMes.toISOString())
    .lt('created_at', finMes)

  const totalComisiones = ((comisionesRaw ?? []) as Array<{ comision_calculada: number | string }>)
    .reduce((acc, r) => acc + Number(r.comision_calculada ?? 0), 0)

  if (rpcResult.error || !rpcResult.data || (rpcResult.data as unknown[]).length === 0) {
    return {
      ganancia: 0,
      costoTotal: 0,
      ventasNetas: 0,
      margenPct: null,
      tieneData: false,
      totalEgresos: Math.round(totalEgresos * 100) / 100,
      totalComisiones: Math.round(totalComisiones * 100) / 100,
      resultadoNeto: Math.round((-totalEgresos - totalComisiones) * 100) / 100,
    }
  }

  const row = (rpcResult.data as unknown[])[0] as Record<string, unknown>
  const ganancia    = Number(row.ganancia    ?? 0)
  const costoTotal  = Number(row.costo_total ?? 0)
  const ventasNetas = Number(row.ventas_netas ?? 0)
  const tieneData   = Boolean(row.tiene_data)

  const gananciaR        = Math.round(ganancia * 100) / 100
  const egresosR         = Math.round(totalEgresos * 100) / 100
  const comisionesR      = Math.round(totalComisiones * 100) / 100
  const resultadoNetoR   = Math.round((gananciaR - egresosR - comisionesR) * 100) / 100

  return {
    ganancia: gananciaR,
    costoTotal: Math.round(costoTotal * 100) / 100,
    ventasNetas: Math.round(ventasNetas * 100) / 100,
    margenPct: ventasNetas > 0 && tieneData
      ? Math.round((ganancia / ventasNetas) * 1000) / 10
      : null,
    tieneData,
    totalEgresos: egresosR,
    totalComisiones: comisionesR,
    resultadoNeto: resultadoNetoR,
  }
}
