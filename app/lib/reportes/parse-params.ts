import { mesActualISOArgentina, partsArgentina } from '@/lib/datetime'

export type ReporteTab = 'finanzas' | 'ventas' | 'stock' | 'operacion'

const TABS: ReporteTab[] = ['finanzas', 'ventas', 'stock', 'operacion']

export function parseTab(value?: string): ReporteTab {
  if (value && TABS.includes(value as ReporteTab)) return value as ReporteTab
  return 'finanzas'
}

export function parseMeses(value?: string): number {
  const n = Number(value ?? '12')
  return [3, 6, 12].includes(n) ? n : 12
}

export function mesActualISO(): string {
  return mesActualISOArgentina()
}

export function parseMesSeleccionado(value?: string): string {
  if (value && /^\d{4}-\d{2}$/.test(value)) return value
  return mesActualISO()
}

export function mesToAnioMes(mesISO: string): { anio: number; mes: number } {
  const [y, m] = mesISO.split('-').map(Number)
  return { anio: y, mes: m }
}

export function mesLabelCorto(mesISO: string): string {
  const { anio, mes } = mesToAnioMes(mesISO)
  const nombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${nombres[mes - 1]} ${String(anio).slice(2)}`
}

/** Últimos N meses como YYYY-MM (incluye mes actual). */
export function ultimosMesesISO(cantidad: number): string[] {
  const out: string[] = []
  const { year, month } = partsArgentina()
  for (let i = 0; i < cantidad; i++) {
    const totalMonths = year * 12 + (month - 1) - i
    const y = Math.floor(totalMonths / 12)
    const m = (totalMonths % 12) + 1
    out.push(`${y}-${String(m).padStart(2, '0')}`)
  }
  return out
}
