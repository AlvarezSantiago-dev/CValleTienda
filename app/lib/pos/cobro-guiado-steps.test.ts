import { describe, it, expect } from 'vitest'
import {
  totalAPagar,
  pasoPagoValido,
  puedeFinalizarCobro,
  pagosInsuficientes,
  sincronizarPagosTrasDescuento,
  sumaPagos,
} from './cobro-guiado-steps'
import type { CobroGuiadoContext } from './cobro-guiado-steps'

const metodos = [] as CobroGuiadoContext['metodos']

function ctx(partial: Partial<CobroGuiadoContext>): CobroGuiadoContext {
  return {
    subtotal: 1000,
    descuento: 0,
    saldoFavorAplicado: 0,
    pagos: [],
    cliente: null,
    metodos,
    ...partial,
  }
}

describe('cobro-guiado-steps', () => {
  it('totalAPagar resta descuento y saldo a favor', () => {
    expect(totalAPagar(ctx({ subtotal: 1000, descuento: 100, saldoFavorAplicado: 200 }))).toBe(700)
  })

  it('pasoPagoValido rechaza pago insuficiente', () => {
    expect(
      pasoPagoValido(
        ctx({
          pagos: [{ id: '1', metodo_pago_id: 'm1', monto: 500, referencia: '' }],
        })
      )
    ).toBe(false)
  })

  it('pasoPagoValido acepta pago exacto', () => {
    expect(
      pasoPagoValido(
        ctx({
          pagos: [{ id: '1', metodo_pago_id: 'm1', monto: 1000, referencia: '' }],
        })
      )
    ).toBe(true)
  })

  it('pasoPagoValido acepta saldo a favor que cubre todo', () => {
    expect(
      pasoPagoValido(
        ctx({
          saldoFavorAplicado: 1000,
          pagos: [],
        })
      )
    ).toBe(true)
  })

  it('multi-pago suma correctamente', () => {
    const c = ctx({
      pagos: [
        { id: '1', metodo_pago_id: 'm1', monto: 600, referencia: '' },
        { id: '2', metodo_pago_id: 'm2', monto: 400, referencia: '' },
      ],
    })
    expect(sumaPagos(c.pagos)).toBe(1000)
    expect(pasoPagoValido(c)).toBe(true)
    expect(puedeFinalizarCobro(c)).toBe(true)
  })

  it('pagosInsuficientes tras descuento', () => {
    const c = ctx({
      descuento: 200,
      pagos: [{ id: '1', metodo_pago_id: 'm1', monto: 1000, referencia: '' }],
    })
    expect(pagosInsuficientes(c)).toBe(true)
  })

  it('sincronizarPagosTrasDescuento actualiza pago único', () => {
    const pagos = [{ id: '1', metodo_pago_id: 'm1', monto: 1000, referencia: '' }]
    const next = sincronizarPagosTrasDescuento(pagos, 1000, 800)
    expect(next[0].monto).toBe(800)
  })

  it('sincronizarPagosTrasDescuento no toca multi-pago', () => {
    const pagos = [
      { id: '1', metodo_pago_id: 'm1', monto: 600, referencia: '' },
      { id: '2', metodo_pago_id: 'm2', monto: 400, referencia: '' },
    ]
    const next = sincronizarPagosTrasDescuento(pagos, 1000, 800)
    expect(next).toBe(pagos)
  })
})
