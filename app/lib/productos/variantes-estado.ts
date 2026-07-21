import type { VarianteInput } from '@/app/actions/productos'
import type { Talla, Color } from '@/types/database'
import { esStockVendible } from '@/lib/stock/infinito'

export interface ResumenVariantes {
  total: number
  conCodigo: number
  conStock: number
  completas: number
  sinCodigo: number
  sinStock: number
  porcentajeListo: number
  primeraIncompletaIdx: number | null
}

export interface OpcionesResumen {
  modoEdicion: boolean
  requiereStockPositivo?: boolean
}

function activas(variantes: VarianteInput[]): VarianteInput[] {
  return variantes.filter((v) => !v.eliminar)
}

function tieneCodigo(v: VarianteInput): boolean {
  return !!v.codigo_barras?.trim()
}

function tieneStock(v: VarianteInput): boolean {
  return esStockVendible(v.stock_inicial ?? 0)
}

function esCompleta(
  v: VarianteInput,
  opts: OpcionesResumen
): boolean {
  if (!tieneCodigo(v)) return false
  if (opts.modoEdicion) return true
  if (opts.requiereStockPositivo === false) return true
  return tieneStock(v)
}

export function calcularResumenVariantes(
  variantes: VarianteInput[],
  opts: OpcionesResumen
): ResumenVariantes {
  const lista = activas(variantes)
  const total = lista.length
  const conCodigo = lista.filter(tieneCodigo).length
  const conStock = lista.filter(tieneStock).length
  const completas = lista.filter((v) => esCompleta(v, opts)).length
  const sinCodigo = total - conCodigo
  const sinStock = opts.modoEdicion ? 0 : total - conStock
  const porcentajeListo = total === 0 ? 0 : Math.round((completas / total) * 100)

  let primeraIncompletaIdx: number | null = null
  for (let i = 0; i < variantes.length; i++) {
    if (variantes[i].eliminar) continue
    if (!esCompleta(variantes[i], opts)) {
      primeraIncompletaIdx = i
      break
    }
  }

  return {
    total,
    conCodigo,
    conStock,
    completas,
    sinCodigo,
    sinStock,
    porcentajeListo,
    primeraIncompletaIdx,
  }
}

export function indicePrimeraSinCodigo(variantes: VarianteInput[]): number | null {
  for (let i = 0; i < variantes.length; i++) {
    if (variantes[i].eliminar) continue
    if (!tieneCodigo(variantes[i])) return i
  }
  return null
}

export function indicePrimeraSinStock(variantes: VarianteInput[]): number | null {
  for (let i = 0; i < variantes.length; i++) {
    if (variantes[i].eliminar) continue
    if (!tieneStock(variantes[i])) return i
  }
  return null
}

export function labelVariante(
  v: VarianteInput,
  tallas: Talla[],
  colores: Color[],
  labels: { var1: string; var2: string; usarVar2: boolean }
): string {
  const partes: string[] = []
  if (v.talla_id) {
    const t = tallas.find((x) => x.id === v.talla_id)
    if (t) partes.push(t.nombre)
  }
  if (labels.usarVar2 && v.color_id) {
    const c = colores.find((x) => x.id === v.color_id)
    if (c) partes.push(c.nombre)
  }
  if (partes.length === 0) {
    return `Sin ${labels.var1.toLowerCase()}`
  }
  return partes.join(' · ')
}
