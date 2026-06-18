import { getReporteCtx, rangoMes } from './context'
import type { MovimientoStockMes, StockResumen, TopIngresoMes } from './types'

export async function obtenerStockResumen(): Promise<StockResumen> {
  const { supabase, tiendaId } = await getReporteCtx()

  const { data, error } = await supabase.rpc('get_stock_resumen', {
    p_tienda_id: tiendaId,
  })

  if (!error && data && (data as unknown[]).length > 0) {
    const r = (data as Array<Record<string, unknown>>)[0]
    return {
      valorInventario: Number(r.valor_inventario ?? 0),
      totalVariantes: Number(r.total_variantes ?? 0),
      bajoStock: Number(r.bajo_stock ?? 0),
      sinStock: Number(r.sin_stock ?? 0),
    }
  }

  const { data: rows } = await supabase
    .from('variantes_producto')
    .select('stock_actual, stock_minimo, producto:productos!inner(precio_compra, activo)')
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .eq('producto.activo', true)

  let valorInventario = 0
  let bajoStock = 0
  let sinStock = 0
  for (const r of rows ?? []) {
    const stock = Number(r.stock_actual ?? 0)
    const min = Number(r.stock_minimo ?? 0)
    const producto = Array.isArray(r.producto) ? r.producto[0] : r.producto
    const costo = Number((producto as { precio_compra?: number } | null)?.precio_compra ?? 0)
    valorInventario += stock * costo
    if (stock <= 0) sinStock++
    else if (min > 0 && stock <= min) bajoStock++
  }

  return {
    valorInventario: Math.round(valorInventario),
    totalVariantes: rows?.length ?? 0,
    bajoStock,
    sinStock,
  }
}

export async function obtenerMovimientosStockMes(
  anio: number,
  mes: number
): Promise<MovimientoStockMes[]> {
  const { supabase, tiendaId } = await getReporteCtx()

  const { data, error } = await supabase.rpc('get_movimientos_stock_mes', {
    p_tienda_id: tiendaId,
    p_anio: anio,
    p_mes: mes,
  })

  if (!error && data) {
    return (data as Array<Record<string, unknown>>).map((r) => ({
      tipo: String(r.tipo ?? ''),
      cantidadTotal: Number(r.cantidad_total ?? 0),
      cantidadMovs: Number(r.cantidad_movs ?? 0),
    }))
  }

  const { inicio, fin } = rangoMes(anio, mes)
  const { data: movs } = await supabase
    .from('movimientos_stock')
    .select('tipo, cantidad')
    .eq('tienda_id', tiendaId)
    .gte('created_at', inicio)
    .lt('created_at', fin)

  const map = new Map<string, { total: number; count: number }>()
  for (const m of movs ?? []) {
    const tipo = String(m.tipo)
    const cur = map.get(tipo) ?? { total: 0, count: 0 }
    cur.total += Math.abs(Number(m.cantidad))
    cur.count++
    map.set(tipo, cur)
  }

  return Array.from(map.entries()).map(([tipo, v]) => ({
    tipo,
    cantidadTotal: v.total,
    cantidadMovs: v.count,
  }))
}

export async function obtenerTopIngresosMes(
  anio: number,
  mes: number,
  limit = 5
): Promise<TopIngresoMes[]> {
  const { supabase, tiendaId } = await getReporteCtx()
  const { inicio, fin } = rangoMes(anio, mes)

  const { data } = await supabase
    .from('movimientos_stock')
    .select(
      'cantidad, created_at, variante:variantes_producto(producto:productos(nombre))'
    )
    .eq('tienda_id', tiendaId)
    .eq('tipo', 'entrada')
    .gte('created_at', inicio)
    .lt('created_at', fin)
    .order('cantidad', { ascending: false })
    .limit(limit)

  return (data ?? []).map((r) => {
    const variante = Array.isArray(r.variante) ? r.variante[0] : r.variante
    const producto = variante
      ? Array.isArray((variante as Record<string, unknown>).producto)
        ? ((variante as Record<string, unknown>).producto as unknown[])[0]
        : (variante as Record<string, unknown>).producto
      : null
    return {
      productoNombre: (producto as { nombre?: string } | null)?.nombre ?? 'Producto',
      cantidad: Number(r.cantidad),
      fecha: String(r.created_at).slice(0, 10),
    }
  })
}
