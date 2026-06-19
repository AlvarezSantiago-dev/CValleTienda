import type { PagoLinea } from '@/components/pos/PagoMultiMetodo'
import type { ClienteLite } from '@/app/actions/ventas'
import type { MetodoPago } from '@/lib/configuracion/queries'

export type PasoCobroGuiado = 'pago' | 'cliente' | 'descuento' | 'confirmacion'

export const PASOS_ORDEN: PasoCobroGuiado[] = ['pago', 'cliente', 'descuento', 'confirmacion']

export const PASO_LABELS: Record<PasoCobroGuiado, string> = {
  pago: 'Pago',
  cliente: 'Cliente',
  descuento: 'Descuento',
  confirmacion: 'Confirmar',
}

export interface CobroGuiadoContext {
  subtotal: number
  descuento: number
  saldoFavorAplicado: number
  pagos: PagoLinea[]
  cliente: ClienteLite | null
  metodos: MetodoPago[]
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function totalBruto(ctx: Pick<CobroGuiadoContext, 'subtotal' | 'descuento'>): number {
  return Math.max(0, round2(ctx.subtotal - ctx.descuento))
}

export function totalAPagar(ctx: CobroGuiadoContext): number {
  return Math.max(0, round2(totalBruto(ctx) - ctx.saldoFavorAplicado))
}

export function sumaPagos(pagos: PagoLinea[]): number {
  return pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0)
}

export function pasoPagoValido(ctx: CobroGuiadoContext): boolean {
  const total = totalAPagar(ctx)
  if (total <= 0 && ctx.saldoFavorAplicado > 0) return true
  const suma = sumaPagos(ctx.pagos)
  return suma + ctx.saldoFavorAplicado + 0.01 >= total
}

export function pasoClienteValido(): boolean {
  return true
}

export function pasoDescuentoValido(_ctx: CobroGuiadoContext): boolean {
  return true
}

export function puedeFinalizarCobro(ctx: CobroGuiadoContext): boolean {
  return pasoPagoValido(ctx)
}

export function pagosInsuficientes(ctx: CobroGuiadoContext): boolean {
  const total = totalAPagar(ctx)
  if (total <= 0) return false
  return sumaPagos(ctx.pagos) + ctx.saldoFavorAplicado + 0.01 < total
}

export function pasoValido(paso: PasoCobroGuiado, ctx: CobroGuiadoContext): boolean {
  switch (paso) {
    case 'pago':
      return pasoPagoValido(ctx)
    case 'cliente':
      return pasoClienteValido()
    case 'descuento':
      return pasoDescuentoValido(ctx)
    case 'confirmacion':
      return puedeFinalizarCobro(ctx)
    default:
      return false
  }
}

export function siguientePaso(paso: PasoCobroGuiado): PasoCobroGuiado | null {
  const idx = PASOS_ORDEN.indexOf(paso)
  if (idx < 0 || idx >= PASOS_ORDEN.length - 1) return null
  return PASOS_ORDEN[idx + 1]
}

export function anteriorPaso(paso: PasoCobroGuiado): PasoCobroGuiado | null {
  const idx = PASOS_ORDEN.indexOf(paso)
  if (idx <= 0) return null
  return PASOS_ORDEN[idx - 1]
}

/** Si hay un solo pago que cubría el total anterior, actualizarlo al nuevo total. */
export function sincronizarPagosTrasDescuento(
  pagos: PagoLinea[],
  totalAnterior: number,
  totalNuevo: number
): PagoLinea[] {
  if (pagos.length !== 1) return pagos
  const p = pagos[0]
  const montoAnterior = Number(p.monto || 0)
  if (Math.abs(montoAnterior - totalAnterior) > 0.02) return pagos
  return [{ ...p, monto: round2(totalNuevo) }]
}
