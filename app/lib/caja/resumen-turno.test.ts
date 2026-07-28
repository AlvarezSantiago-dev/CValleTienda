import { describe, it, expect } from 'vitest'
import { labelTipoCuenta, labelTipoMovimiento } from './labels'
import { mapResumenTurnoFromRpc } from './resumen-turno'

describe('labelTipoCuenta', () => {
  it('traduce tipos conocidos', () => {
    expect(labelTipoCuenta('efectivo')).toBe('Efectivo')
    expect(labelTipoCuenta('mercado_pago')).toBe('Mercado Pago')
    expect(labelTipoCuenta('transferencia')).toBe('Transferencia')
  })

  it('formatea tipos desconocidos', () => {
    expect(labelTipoCuenta('cuenta_corriente')).toBe('Cuenta Corriente')
  })
})

describe('labelTipoMovimiento', () => {
  it('traduce tipos de movimiento', () => {
    expect(labelTipoMovimiento('ingreso')).toBe('Ingreso')
    expect(labelTipoMovimiento('egreso')).toBe('Egreso')
  })
})

describe('mapResumenTurnoFromRpc', () => {
  it('mapea jsonb del RPC a ResumenTurno', () => {
    const raw = {
      total_ventas_monto: 15000,
      total_ventas_cantidad: 3,
      total_devoluciones_monto: 0,
      total_devoluciones_cantidad: 0,
      total_comisiones: 450,
      total_neto: 14550,
      monto_apertura_efectivo: 10000,
      efectivo_esperado: 18000,
      detalle_por_cuenta: [
        {
          cuenta_fondo_id: 'abc',
          nombre_cuenta: 'Efectivo',
          tipo_cuenta: 'efectivo',
          total_ingresos: 8000,
          total_egresos: 0,
          comision_estimada: 0,
          total_neto: 8000,
          saldo_antes_turno: 10000,
          saldo_despues_turno: 18000,
        },
      ],
      pagos_por_cuenta: [
        {
          nombre_cuenta: 'Efectivo',
          cantidad_pagos: 2,
          monto_bruto: 8000,
          comision: 0,
          monto_neto: 8000,
        },
      ],
    }

    const res = mapResumenTurnoFromRpc(raw)
    expect(res).not.toBeNull()
    expect(res!.efectivo_esperado).toBe(18000)
    expect(res!.total_redondeo_efectivo).toBe(0)
    expect(res!.detalle_por_cuenta).toHaveLength(1)
    expect(res!.pagos_por_cuenta[0].cantidad_pagos).toBe(2)
  })

  it('retorna null para datos inválidos', () => {
    expect(mapResumenTurnoFromRpc(null)).toBeNull()
  })

  it('mapea el split de devoluciones reintegro vs crédito', () => {
    const raw = {
      total_ventas_monto: 110000,
      total_ventas_cantidad: 2,
      total_devoluciones_monto: 30000,
      total_devoluciones_cantidad: 1,
      total_devoluciones_reintegro: 0,
      total_devoluciones_credito: 30000,
      total_comisiones: 0,
      total_neto: 80000,
      monto_apertura_efectivo: 10000,
      efectivo_esperado: 90000,
      detalle_por_cuenta: [],
      pagos_por_cuenta: [],
    }
    const res = mapResumenTurnoFromRpc(raw)
    expect(res!.total_devoluciones_reintegro).toBe(0)
    expect(res!.total_devoluciones_credito).toBe(30000)
    expect(res!.total_neto).toBe(80000)
  })

  it('defaultea el split a 0 en payloads previos a la migración', () => {
    const raw = {
      total_ventas_monto: 5000,
      total_ventas_cantidad: 1,
      total_devoluciones_monto: 0,
      total_devoluciones_cantidad: 0,
      total_comisiones: 0,
      total_neto: 5000,
      monto_apertura_efectivo: 0,
      efectivo_esperado: 5000,
      detalle_por_cuenta: [],
      pagos_por_cuenta: [],
    }
    const res = mapResumenTurnoFromRpc(raw)
    expect(res!.total_devoluciones_reintegro).toBe(0)
    expect(res!.total_devoluciones_credito).toBe(0)
  })
})
