import { getReporteCtx, rangoMes } from './context'
import { FILTRO_DEVOLUCIONES_MONETARIAS } from './formulas'
import type { KpisVentasMes, MixPagoMes, TasaDevolucionesMes, TopProductoMes, TopVar1Mes } from './types'

export async function obtenerTopProductosMes(
  anio: number,
  mes: number,
  limit = 10
): Promise<TopProductoMes[]> {
  const { supabase, tiendaId } = await getReporteCtx()
  const { inicio, fin } = rangoMes(anio, mes)

  const { data, error } = await supabase.rpc('get_top_productos_mes', {
    p_tienda_id: tiendaId,
    p_anio: anio,
    p_mes: mes,
    p_limit: limit,
  })

  if (!error && data) {
    return (data as Array<Record<string, unknown>>).map((r) => ({
      nombre: String(r.nombre ?? '—'),
      cantidad: Number(r.cantidad ?? 0),
      monto: Number(r.monto ?? 0),
    }))
  }

  const { data: rows } = await supabase
    .from('detalles_venta')
    .select('nombre_producto, cantidad, total_linea, venta:ventas!inner(estado, created_at)')
    .eq('tienda_id', tiendaId)
    .gte('venta.created_at', inicio)
    .lt('venta.created_at', fin)
    .eq('venta.estado', 'completada')

  const map = new Map<string, { cantidad: number; monto: number }>()
  for (const r of rows ?? []) {
    const venta = Array.isArray(r.venta) ? r.venta[0] : r.venta
    if (!venta) continue
    const nombre = (r.nombre_producto as string) ?? '—'
    const cur = map.get(nombre) ?? { cantidad: 0, monto: 0 }
    cur.cantidad += Number(r.cantidad)
    cur.monto += Number(r.total_linea)
    map.set(nombre, cur)
  }

  return Array.from(map.entries())
    .map(([nombre, v]) => ({ nombre, cantidad: v.cantidad, monto: v.monto }))
    .sort((a, b) => b.monto - a.monto)
    .slice(0, limit)
}

export async function obtenerTopVar1Mes(
  anio: number,
  mes: number,
  limit = 10
): Promise<TopVar1Mes[]> {
  const { supabase, tiendaId } = await getReporteCtx()
  const { inicio, fin } = rangoMes(anio, mes)

  const { data } = await supabase
    .from('detalles_venta')
    .select('talla, cantidad, total_linea, venta:ventas!inner(estado, created_at)')
    .eq('tienda_id', tiendaId)
    .not('talla', 'is', null)
    .gte('venta.created_at', inicio)
    .lt('venta.created_at', fin)
    .eq('venta.estado', 'completada')

  const map = new Map<string, { cantidad: number; monto: number }>()
  for (const r of data ?? []) {
    const venta = Array.isArray(r.venta) ? r.venta[0] : r.venta
    if (!venta) continue
    const valor = (r.talla as string) ?? '—'
    const cur = map.get(valor) ?? { cantidad: 0, monto: 0 }
    cur.cantidad += Number(r.cantidad)
    cur.monto += Number(r.total_linea)
    map.set(valor, cur)
  }

  return Array.from(map.entries())
    .map(([valor, v]) => ({ valor, cantidad: v.cantidad, monto: v.monto }))
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, limit)
}

export async function obtenerKpisVentasMes(anio: number, mes: number): Promise<KpisVentasMes> {
  const { supabase, tiendaId } = await getReporteCtx()
  const { inicio, fin } = rangoMes(anio, mes)

  const { data, error } = await supabase.rpc('get_kpis_ventas_mes', {
    p_tienda_id: tiendaId,
    p_anio: anio,
    p_mes: mes,
  })

  if (!error && data && (data as unknown[]).length > 0) {
    const r = (data as Array<Record<string, unknown>>)[0]
    return {
      cantidadVentas: Number(r.cantidad_ventas ?? 0),
      ventasNetas: Number(r.ventas_netas ?? 0),
      ticketPromedio: Number(r.ticket_promedio ?? 0),
      unidadesVendidas: Number(r.unidades_vendidas ?? 0),
    }
  }

  const { data: ventas } = await supabase
    .from('ventas')
    .select('total')
    .eq('tienda_id', tiendaId)
    .eq('estado', 'completada')
    .gte('created_at', inicio)
    .lt('created_at', fin)

  const { data: detalles } = await supabase
    .from('detalles_venta')
    .select('cantidad, venta:ventas!inner(estado, created_at)')
    .eq('tienda_id', tiendaId)
    .gte('venta.created_at', inicio)
    .lt('venta.created_at', fin)
    .eq('venta.estado', 'completada')

  const cantidadVentas = ventas?.length ?? 0
  const ventasBrutas = (ventas ?? []).reduce((s, v) => s + Number(v.total), 0)

  const { data: devs } = await supabase
    .from('devoluciones')
    .select('total_devuelto')
    .eq('tienda_id', tiendaId)
    .eq('estado', 'completada')
    .or(FILTRO_DEVOLUCIONES_MONETARIAS)
    .gte('created_at', inicio)
    .lt('created_at', fin)

  const devoluciones = (devs ?? []).reduce((s, d) => s + Number(d.total_devuelto), 0)
  const ventasNetas = ventasBrutas - devoluciones
  let unidades = 0
  for (const d of detalles ?? []) {
    const venta = Array.isArray(d.venta) ? d.venta[0] : d.venta
    if (venta) unidades += Number(d.cantidad)
  }

  return {
    cantidadVentas,
    ventasNetas,
    ticketPromedio: cantidadVentas > 0 ? Math.round(ventasNetas / cantidadVentas) : 0,
    unidadesVendidas: unidades,
  }
}

export async function obtenerMixPagosMes(anio: number, mes: number): Promise<MixPagoMes[]> {
  const { supabase, tiendaId } = await getReporteCtx()

  const { data, error } = await supabase.rpc('get_mix_pagos_mes', {
    p_tienda_id: tiendaId,
    p_anio: anio,
    p_mes: mes,
  })

  if (!error && data) {
    return (data as Array<Record<string, unknown>>).map((r) => ({
      metodoNombre: String(r.metodo_nombre ?? '—'),
      monto: Number(r.monto ?? 0),
      porcentaje: Number(r.porcentaje ?? 0),
    }))
  }

  const { inicio, fin } = rangoMes(anio, mes)
  const { data: pagos } = await supabase
    .from('pagos_venta')
    .select('monto, metodo:metodos_pago(nombre), venta:ventas!inner(estado, created_at)')
    .eq('tienda_id', tiendaId)
    .gte('venta.created_at', inicio)
    .lt('venta.created_at', fin)
    .eq('venta.estado', 'completada')

  const map = new Map<string, number>()
  for (const p of pagos ?? []) {
    const metodo = Array.isArray(p.metodo) ? p.metodo[0] : p.metodo
    const nombre = (metodo as { nombre?: string } | null)?.nombre ?? 'Otro'
    map.set(nombre, (map.get(nombre) ?? 0) + Number(p.monto))
  }

  const total = Array.from(map.values()).reduce((s, v) => s + v, 0)
  return Array.from(map.entries())
    .map(([metodoNombre, monto]) => ({
      metodoNombre,
      monto,
      porcentaje: total > 0 ? Math.round((monto / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.monto - a.monto)
}

export async function obtenerTasaDevolucionesMes(
  anio: number,
  mes: number
): Promise<TasaDevolucionesMes> {
  const { supabase, tiendaId } = await getReporteCtx()
  const { inicio, fin } = rangoMes(anio, mes)

  const { data: ventas } = await supabase
    .from('ventas')
    .select('total')
    .eq('tienda_id', tiendaId)
    .eq('estado', 'completada')
    .gte('created_at', inicio)
    .lt('created_at', fin)

  const ventasBrutas = (ventas ?? []).reduce((s, v) => s + Number(v.total), 0)

  const { data: devs } = await supabase
    .from('devoluciones')
    .select('total_devuelto')
    .eq('tienda_id', tiendaId)
    .eq('estado', 'completada')
    .or(FILTRO_DEVOLUCIONES_MONETARIAS)
    .gte('created_at', inicio)
    .lt('created_at', fin)

  const montoDevoluciones = (devs ?? []).reduce((s, d) => s + Number(d.total_devuelto), 0)

  return {
    montoDevoluciones,
    ventasBrutas,
    tasaPct: ventasBrutas > 0 ? Math.round((montoDevoluciones / ventasBrutas) * 1000) / 10 : null,
  }
}
