// =============================================================
// lib/planes/config.ts
// Definición de planes y features (Básico / Pro).
// Fuente de verdad para qué puede hacer cada plan.
// Acceso temporal (pago / mes vencido): ver lib/planes/acceso.ts
// =============================================================

export type { EstadoAcceso } from '@/lib/planes/acceso'
export {
  tieneAcceso,
  diasRestantesAcceso,
  estadoAcceso,
  fechaFinAcceso,
} from '@/lib/planes/acceso'

export type PlanTipo = 'basico' | 'pro'

/** Features que requieren plan Pro */
export type Feature =
  | 'remitos'
  | 'devoluciones'
  | 'crm_completo'        // ficha detalle cliente + historial + cuenta corriente
  | 'importar_csv'
  | 'disenador_etiquetas'
  | 'facturacion'
  | 'usuarios_multiples'  // reservado para futuro

/** Límites numéricos del plan Básico */
export const LIMITES_BASICO = {
  max_productos: 300,
} as const

/** Features exclusivas de Pro */
const FEATURES_PRO: Feature[] = [
  'remitos',
  'devoluciones',
  'crm_completo',
  'importar_csv',
  'disenador_etiquetas',
  'facturacion',
  'usuarios_multiples',
]

/** Devuelve true si el plan efectivo tiene acceso a la feature */
export function puedeUsar(planEfectivo: PlanTipo, feature: Feature): boolean {
  if (planEfectivo === 'pro') return true
  return !FEATURES_PRO.includes(feature)
}

/**
 * Plan efectivo = considera el trial activo.
 * Mientras trial_hasta sea futuro, el plan efectivo es 'pro' independiente del plan base.
 */
export function getPlanEfectivo(
  plan: PlanTipo,
  trial_hasta: string | null | undefined
): PlanTipo {
  if (trial_hasta && new Date(trial_hasta) > new Date()) return 'pro'
  return plan
}

/** Días restantes de trial (0 si no hay trial activo) */
export function diasRestantesTrial(trial_hasta: string | null | undefined): number {
  if (!trial_hasta) return 0
  const diff = new Date(trial_hasta).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/** Etiqueta visual para mostrar en UI */
export function labelPlan(planEfectivo: PlanTipo, esTrial: boolean): string {
  if (esTrial) return 'TRIAL'
  if (planEfectivo === 'pro') return 'PRO'
  return 'BÁSICO'
}

/** Descripciones de features para el banner de upgrade */
export const DESCRIPCION_FEATURE: Record<Feature, string> = {
  remitos:              'Emisión de remitos de entrega profesionales (A4)',
  devoluciones:         'Gestión de devoluciones totales y parciales con reintegro de stock',
  crm_completo:         'Ficha de cliente completa: historial de compras y cuenta corriente',
  importar_csv:         'Importación masiva de productos desde planilla CSV',
  disenador_etiquetas:  'Diseñador de etiquetas personalizable con preview en tiempo real',
  facturacion:          'Facturación electrónica AFIP/ARCA via TusFacturasAPP',
  usuarios_multiples:   'Hasta 3 usuarios por tienda',
}

/** Precios de referencia (strings para mostrar en UI) — comercial ago 2026 */
export const PRECIOS = {
  basico: '$45.000/mes', // reservado; oferta comercial vigente = solo Pro
  pro:    '$45.000/mes',
} as const

/** Onboarding (pago único) — referencia comercial */
export const PRECIO_ONBOARDING = '$120.000' as const

/** Oferta comercial vigente: un solo plan (Pro) */
export const OFERTA_COMERCIAL = {
  planUnico: 'pro' as const,
  label: 'Plan Pro',
  mensuales: PRECIOS.pro,
  instalacion: PRECIO_ONBOARDING,
} as const
