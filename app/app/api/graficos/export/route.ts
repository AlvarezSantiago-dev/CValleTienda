import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseTab, parseMeses, parseMesSeleccionado, mesToAnioMes } from '@/lib/reportes/parse-params'
import { obtenerReporteHistorico } from '@/lib/reportes/queries'
import {
  obtenerKpisVentasMes,
  obtenerMixPagosMes,
  obtenerTopProductosMes,
  obtenerTasaDevolucionesMes,
} from '@/lib/reportes/queries-ventas'
import {
  obtenerMovimientosStockMes,
  obtenerStockResumen,
  obtenerTopIngresosMes,
} from '@/lib/reportes/queries-stock'
import {
  obtenerComparacionMes,
  obtenerRemitosPendientesResumen,
  obtenerVentasPorVendedorMes,
} from '@/lib/reportes/queries-operacion'

function csvEscape(value: string | number): string {
  const s = String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function row(cells: (string | number)[]): string {
  return cells.map(csvEscape).join(',')
}

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle()

  if (perfil?.rol === 'vendedor') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const tab = parseTab(searchParams.get('tab') ?? undefined)
  const meses = parseMeses(searchParams.get('meses') ?? undefined)
  const mes = parseMesSeleccionado(searchParams.get('mes') ?? undefined)
  const { anio, mes: mesNum } = mesToAnioMes(mes)

  const lines: string[] = []

  if (tab === 'finanzas') {
    const { filas } = await obtenerReporteHistorico(meses)
    lines.push(row(['Mes', 'Ventas netas', 'Ganancia bruta', 'Comisiones', 'Egresos', 'Resultado neto']))
    for (const f of filas) {
      lines.push(row([
        f.mesLabel,
        f.ventasNetas,
        f.gananciaBruta,
        f.comisiones,
        f.egresosManuales,
        f.resultadoNeto,
      ]))
    }
  } else if (tab === 'ventas') {
    const [kpis, tops, mix, tasa] = await Promise.all([
      obtenerKpisVentasMes(anio, mesNum),
      obtenerTopProductosMes(anio, mesNum),
      obtenerMixPagosMes(anio, mesNum),
      obtenerTasaDevolucionesMes(anio, mesNum),
    ])
    lines.push('KPIs')
    lines.push(row(['Tickets', kpis.cantidadVentas]))
    lines.push(row(['Ventas netas', kpis.ventasNetas]))
    lines.push(row(['Ticket promedio', kpis.ticketPromedio]))
    lines.push(row(['Unidades vendidas', kpis.unidadesVendidas]))
    lines.push('')
    lines.push('Top productos')
    lines.push(row(['Producto', 'Cantidad', 'Monto']))
    for (const p of tops) {
      lines.push(row([p.nombre, p.cantidad, p.monto]))
    }
    lines.push('')
    lines.push('Mix pagos')
    lines.push(row(['Método', 'Monto', '%']))
    for (const m of mix) {
      lines.push(row([m.metodoNombre, m.monto, m.porcentaje]))
    }
    lines.push('')
    lines.push(row(['Tasa devoluciones %', tasa.tasaPct ?? '']))
    lines.push(row(['Monto devoluciones', tasa.montoDevoluciones]))
  } else if (tab === 'stock') {
    const [resumen, movs, ingresos] = await Promise.all([
      obtenerStockResumen(),
      obtenerMovimientosStockMes(anio, mesNum),
      obtenerTopIngresosMes(anio, mesNum),
    ])
    lines.push('Resumen inventario')
    lines.push(row(['Valor inventario', resumen.valorInventario]))
    lines.push(row(['Variantes', resumen.totalVariantes]))
    lines.push(row(['Bajo stock', resumen.bajoStock]))
    lines.push(row(['Sin stock', resumen.sinStock]))
    lines.push('')
    lines.push('Movimientos del mes')
    lines.push(row(['Tipo', 'Unidades', 'Movimientos']))
    for (const m of movs) {
      lines.push(row([m.tipo, m.cantidadTotal, m.cantidadMovs]))
    }
    lines.push('')
    lines.push('Top ingresos')
    lines.push(row(['Producto', 'Cantidad', 'Fecha']))
    for (const i of ingresos) {
      lines.push(row([i.productoNombre, i.cantidad, i.fecha]))
    }
  } else {
    const [vendedores, cmp, remitos] = await Promise.all([
      obtenerVentasPorVendedorMes(anio, mesNum),
      obtenerComparacionMes(mes, meses),
      obtenerRemitosPendientesResumen(),
    ])
    lines.push('Comparación mes anterior')
    lines.push(row(['Métrica', 'Actual', 'Anterior', 'Delta %']))
    lines.push(row([
      'Ventas netas',
      cmp.ventasNetas.actual,
      cmp.ventasNetas.anterior,
      cmp.ventasNetas.deltaPct ?? '',
    ]))
    lines.push(row([
      'Tickets',
      cmp.tickets.actual,
      cmp.tickets.anterior,
      cmp.tickets.deltaPct ?? '',
    ]))
    lines.push(row([
      'Resultado neto',
      cmp.resultadoNeto.actual,
      cmp.resultadoNeto.anterior,
      cmp.resultadoNeto.deltaPct ?? '',
    ]))
    lines.push('')
    lines.push('Ventas por vendedor')
    lines.push(row(['Vendedor', 'Tickets', 'Monto']))
    for (const v of vendedores) {
      lines.push(row([v.vendedorNombre, v.cantidad, v.monto]))
    }
    lines.push('')
    lines.push(row(['Remitos pendientes', remitos.cantidad]))
    lines.push(row(['Deuda remitos', remitos.totalDeuda]))
  }

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="graficos-${tab}-${mes}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
