// Labels y estilos centralizados para tipo_resolucion de devoluciones.
// Usado por la tabla, el detalle y los tickets para que el cajero
// distinga de un vistazo cómo se resolvió cada devolución.

export type TipoResolucion = 'reembolso' | 'saldo_a_favor' | 'cambio'

export const RESOLUCION_LABEL: Record<TipoResolucion, string> = {
  reembolso: 'Reintegro',
  saldo_a_favor: 'Saldo a favor',
  cambio: 'Cambio',
}

/** Descripción corta del efecto financiero, para tooltips y detalles. */
export const RESOLUCION_DESCRIPCION: Record<TipoResolucion, string> = {
  reembolso: 'Se devolvió dinero al cliente (egreso de caja).',
  saldo_a_favor: 'Se acreditó como crédito del cliente. No salió dinero de la caja.',
  cambio: 'Se cambió por otro producto. No hay movimiento de dinero.',
}

/** Clases Tailwind para el badge de cada resolución. */
export const RESOLUCION_BADGE_CLASS: Record<TipoResolucion, string> = {
  reembolso: 'bg-danger-soft text-danger-soft-fg border border-danger-border',
  saldo_a_favor: 'bg-success-soft text-success-soft-fg border border-success-border',
  cambio: 'bg-info-soft text-info-soft-fg border border-info-border',
}

/** Normaliza el valor crudo de DB (puede ser null en registros legacy). */
export function normalizarResolucion(raw: string | null | undefined): TipoResolucion {
  if (raw === 'saldo_a_favor' || raw === 'cambio') return raw
  return 'reembolso'
}
