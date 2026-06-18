import type { FilaMesReporte } from './queries'

export function deltaPct(actual: number, anterior: number): number | null {
  if (anterior === 0) return null
  return Math.round(((actual - anterior) / anterior) * 1000) / 10
}

export function filaPorMesISO(filas: FilaMesReporte[], mesISO: string): FilaMesReporte | null {
  const [anio, mes] = mesISO.split('-').map(Number)
  return filas.find((f) => f.anio === anio && f.mes === mes) ?? null
}

export function filaMesAnterior(
  filas: FilaMesReporte[],
  mesISO: string
): FilaMesReporte | null {
  const [anio, mes] = mesISO.split('-').map(Number)
  let m = mes - 1
  let a = anio
  if (m < 1) {
    m = 12
    a -= 1
  }
  return filas.find((f) => f.anio === a && f.mes === m) ?? null
}

export function filasParaGraficos(filas: FilaMesReporte[]): FilaMesReporte[] {
  return [...filas].reverse()
}

export function mesLabelCortoFromFila(f: FilaMesReporte): string {
  const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${nombres[f.mes - 1]} ${String(f.anio).slice(2)}`
}
