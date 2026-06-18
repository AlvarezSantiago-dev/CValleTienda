import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

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

export interface FilaMesReporte {
  anio: number
  mes: number              // 1–12
  mesLabel: string         // "Mayo 2026"
  cantidadVentas: number
  ventasBrutas: number
  devoluciones: number
  ventasNetas: number
  costoTotal: number
  gananciaBruta: number
  egresosManuales: number
  comisiones: number
  resultadoNeto: number
  margenPct: number | null
  tieneCostos: boolean
}

export interface TotalesReporte {
  cantidadVentas: number
  ventasBrutas: number
  devoluciones: number
  ventasNetas: number
  costoTotal: number
  gananciaBruta: number
  egresosManuales: number
  comisiones: number
  resultadoNeto: number
  margenPct: number | null
  tieneCostos: boolean
}

export interface ReporteHistorico {
  filas: FilaMesReporte[]
  totales: TotalesReporte
}

const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function totalesVacios(): TotalesReporte {
  return {
    cantidadVentas: 0, ventasBrutas: 0, devoluciones: 0, ventasNetas: 0,
    costoTotal: 0, gananciaBruta: 0, egresosManuales: 0, comisiones: 0, resultadoNeto: 0,
    margenPct: null, tieneCostos: false,
  }
}

export async function obtenerReporteHistorico(meses = 12): Promise<ReporteHistorico> {
  const { supabase, tiendaId } = await getCtx()

  const { data, error } = await supabase.rpc('get_reporte_historico_meses', {
    p_tienda_id: tiendaId,
    p_meses: meses,
  })

  if (error || !data) {
    return { filas: [], totales: totalesVacios() }
  }

  const filas: FilaMesReporte[] = (data as Array<Record<string, unknown>>).map((r) => ({
    anio:            Number(r.anio),
    mes:             Number(r.mes),
    mesLabel:        `${MESES_ES[Number(r.mes) - 1]} ${r.anio}`,
    cantidadVentas:  Number(r.cantidad_ventas  ?? 0),
    ventasBrutas:    Number(r.ventas_brutas     ?? 0),
    devoluciones:    Number(r.devoluciones      ?? 0),
    ventasNetas:     Number(r.ventas_netas      ?? 0),
    costoTotal:      Number(r.costo_total       ?? 0),
    gananciaBruta:   Number(r.ganancia_bruta    ?? 0),
    egresosManuales: Number(r.egresos_manuales  ?? 0),
    comisiones:      Number(r.comisiones       ?? 0),
    resultadoNeto:   Number(r.resultado_neto    ?? 0),
    margenPct:       r.margen_pct != null ? Number(r.margen_pct) : null,
    tieneCostos:     Boolean(r.tiene_costos),
  }))

  // Totales acumulados
  const acc = filas.reduce<TotalesReporte>(
    (t, f) => ({
      cantidadVentas:  t.cantidadVentas  + f.cantidadVentas,
      ventasBrutas:    t.ventasBrutas    + f.ventasBrutas,
      devoluciones:    t.devoluciones    + f.devoluciones,
      ventasNetas:     t.ventasNetas     + f.ventasNetas,
      costoTotal:      t.costoTotal      + f.costoTotal,
      gananciaBruta:   t.gananciaBruta   + f.gananciaBruta,
      egresosManuales: t.egresosManuales + f.egresosManuales,
      comisiones:      t.comisiones      + f.comisiones,
      resultadoNeto:   t.resultadoNeto   + f.resultadoNeto,
      tieneCostos:     t.tieneCostos     || f.tieneCostos,
      margenPct:       null,
    }),
    totalesVacios(),
  )

  const totales: TotalesReporte = {
    ...acc,
    margenPct:
      acc.ventasNetas > 0 && acc.tieneCostos
        ? Math.round((acc.gananciaBruta / acc.ventasNetas) * 1000) / 10
        : null,
  }

  return { filas, totales }
}

export * from './queries-finanzas'
export * from './queries-ventas'
export * from './queries-stock'
export * from './queries-operacion'
export * from './types'
export * from './parse-params'
