import { getReporteCtx, rangoMes } from './context'
import { nombreUsuario } from '@/lib/caja/queries'
import { listarRemitosPendientesCobro } from '@/lib/remitos/queries'
import { obtenerReporteHistorico } from './queries'
import { filaMesAnterior, filaPorMesISO } from './queries-finanzas'
import type { ComparacionMes, VentaPorVendedor, RemitosPendientesResumen } from './types'

export async function obtenerVentasPorVendedorMes(
  anio: number,
  mes: number
): Promise<VentaPorVendedor[]> {
  const { supabase, tiendaId } = await getReporteCtx()
  const { inicio, fin } = rangoMes(anio, mes)

  const { data } = await supabase
    .from('ventas')
    .select('total, usuario:perfiles!ventas_usuario_id_fkey(id, nombre, apellido)')
    .eq('tienda_id', tiendaId)
    .eq('estado', 'completada')
    .gte('created_at', inicio)
    .lt('created_at', fin)

  const map = new Map<string, { cantidad: number; monto: number }>()
  for (const v of data ?? []) {
    const usuario = Array.isArray(v.usuario) ? v.usuario[0] : v.usuario
    const nombre =
      nombreUsuario(
        usuario as { id: string; nombre: string | null; apellido: string | null } | null
      ) ?? 'Sin asignar'
    const cur = map.get(nombre) ?? { cantidad: 0, monto: 0 }
    cur.cantidad++
    cur.monto += Number(v.total)
    map.set(nombre, cur)
  }

  return Array.from(map.entries())
    .map(([vendedorNombre, stats]) => ({
      vendedorNombre,
      cantidad: stats.cantidad,
      monto: stats.monto,
    }))
    .sort((a, b) => b.monto - a.monto)
}

export async function obtenerRemitosPendientesResumen(): Promise<RemitosPendientesResumen> {
  const { remitos, totalDeuda } = await listarRemitosPendientesCobro()
  return { cantidad: remitos.length, totalDeuda }
}

export async function obtenerComparacionMes(
  mesISO: string,
  mesesHistorico = 12
): Promise<ComparacionMes> {
  const { filas } = await obtenerReporteHistorico(mesesHistorico)
  const actual = filaPorMesISO(filas, mesISO)
  const anterior = filaMesAnterior(filas, mesISO)

  function cmp(
    a: number | undefined,
    b: number | undefined
  ): { actual: number; anterior: number; deltaPct: number | null } {
    const act = a ?? 0
    const ant = b ?? 0
    return {
      actual: act,
      anterior: ant,
      deltaPct: ant === 0 ? null : Math.round(((act - ant) / ant) * 1000) / 10,
    }
  }

  return {
    ventasNetas: cmp(actual?.ventasNetas, anterior?.ventasNetas),
    tickets: cmp(actual?.cantidadVentas, anterior?.cantidadVentas),
    resultadoNeto: cmp(actual?.resultadoNeto, anterior?.resultadoNeto),
  }
}
