import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseMeses } from '@/lib/reportes/parse-params'
import { obtenerReporteHistorico } from '@/lib/reportes/queries'
import { csvRow, withCsvBom } from '@/lib/reportes/csv'

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
  const meses = parseMeses(searchParams.get('meses') ?? undefined)
  const { filas } = await obtenerReporteHistorico(meses)

  const lines: string[] = []
  lines.push(csvRow([
    'Mes', 'Tickets', 'Ventas brutas', 'Devoluciones', 'Ventas netas',
    'Costo', 'Ganancia bruta', 'Margen %', 'Egresos', 'Comisiones', 'Resultado neto',
  ]))
  for (const f of filas) {
    lines.push(csvRow([
      f.mesLabel,
      f.cantidadVentas,
      f.ventasBrutas,
      f.devoluciones,
      f.ventasNetas,
      f.costoTotal,
      f.gananciaBruta,
      f.margenPct ?? '',
      f.egresosManuales,
      f.comisiones,
      f.resultadoNeto,
    ]))
  }

  return new NextResponse(withCsvBom(lines.join('\n')), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="reportes-pl-${meses}m.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
