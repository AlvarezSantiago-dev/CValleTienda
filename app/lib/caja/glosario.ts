/**
 * Copy corto para tooltips/ayudas de Caja.
 * Fuente conceptual: referencia/modelo-saldos-cuentas.md
 */

export const glosarioCaja = {
  aperturaEfectivo:
    'Plata física en el cajón al abrir el turno (fondo de cambio). No es el saldo de Mercado Pago ni del banco.',
  efectivoEsperado:
    'Cuánto debería haber en el cajón: apertura + ingresos en efectivo − egresos en efectivo del turno.',
  efectivoDeclarado:
    'Lo que contás físicamente. Si no contás, dejalo vacío: no se calcula diferencia. Cero sí cuenta como $0.',
  diferenciaEfectivo:
    'Declarado − esperado. Positivo = sobrante; negativo = faltante. Vacío si no declaraste.',
  ventasTurno: 'Ventas completadas en esta sesión de caja (monto y cantidad).',
  devolucionesTurno:
    'Devoluciones del turno. Reintegro saca plata de caja; crédito deja saldo a favor al cliente (sin egreso).',
  comisiones: 'Comisiones estimadas de medios de pago (MP, tarjeta, etc.) del turno.',
  totalNetoTurno:
    'Resultado del turno: ventas − devoluciones − comisiones ± movimientos. No es “plata disponible” en una cuenta.',
  saldoAlMomento:
    'Plata que ya podés gastar de esa cuenta (neto, ya acreditada). No es el arqueo del cajón.',
  porAcreditar: 'Cobros registrados cuyo dinero todavía no entró a la cuenta.',
  saldoProyectado: 'Al momento + por acreditar. Lo que quedará cuando todo acredite.',
  movimientoPorCuenta:
    'Ingresos, egresos y neto de esta sesión por cada cuenta de fondos (solo el turno).',
  cobrosPorCuenta: 'Cómo se cobraron las ventas del turno, agrupado por cuenta/método.',
  ajustesRedondeo:
    'Vuelto redondeado que quedó en caja. No es ganancia de producto; entra en el esperado de efectivo.',
} as const

export type ClaveGlosarioCaja = keyof typeof glosarioCaja
