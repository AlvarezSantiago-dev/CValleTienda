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
  reembolso: 'bg-red-50 text-red-700 border border-red-200',
  saldo_a_favor: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  cambio: 'bg-blue-50 text-blue-700 border border-blue-200',
}

/** Normaliza el valor crudo de DB (puede ser null en registros legacy). */
export function normalizarResolucion(raw: string | null | undefined): TipoResolucion {
  if (raw === 'saldo_a_favor' || raw === 'cambio') return raw
  return 'reembolso'
}
