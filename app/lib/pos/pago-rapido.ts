import type { MetodoPago } from '@/lib/configuracion/queries'
import type { PagoLinea } from '@/components/pos/PagoMultiMetodo'

export function detectarMetodoEfectivo(metodos: MetodoPago[]): MetodoPago | null {
  return metodos.find((m) => m.cuenta_fondo?.tipo === 'efectivo') ?? null
}

export function esMetodoEfectivo(metodo: MetodoPago): boolean {
  return metodo.cuenta_fondo?.tipo === 'efectivo'
}

/** Enfoca el primer campo de monto para que el cajero ingrese lo que entrega el cliente */
export function focusPrimerMontoPago(): void {
  requestAnimationFrame(() => {
    const el = document.querySelector('[data-pago-monto]') as HTMLInputElement | null
    el?.focus()
    el?.select()
  })
}

export function metodoPorDefecto(metodos: MetodoPago[]): MetodoPago | null {
  if (metodos.length === 0) return null
  return detectarMetodoEfectivo(metodos) ?? metodos[0]
}

function nuevoPagoId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2, 10)
}

export function crearPagoCompleto(
  metodoId: string,
  total: number,
  id = nuevoPagoId()
): PagoLinea {
  return {
    id,
    metodo_pago_id: metodoId,
    monto: Math.round(total * 100) / 100,
    referencia: '',
  }
}

/** Reemplaza todas las líneas con un pago único por el total */
export function aplicarPagoRapido(metodoId: string, total: number): PagoLinea[] {
  return [crearPagoCompleto(metodoId, total)]
}
