import type { PitchIconKey } from './pitch-icons'

export type PitchPlan = 'incluido'

export interface PitchPoint {
  id: string
  number: number
  title: string
  body: string
  highlights: string[]
  plan: PitchPlan
  iconKey: PitchIconKey
}

/** Comercial vigente: solo Pro */
export const PITCH_PRICING = {
  planLabel: 'Plan Pro',
  planPrice: '$45.000',
  planUnit: '/ mes',
  installLabel: 'Instalación',
  installPrice: '$120.000',
  installUnit: 'pago único',
  installIncludes: '3 capacitaciones × 1 h + 20 productos cargados',
  hardwareNote: 'Máquinas (PC, impresora, scanner) aparte.',
} as const

export const PITCH_CONTACT = {
  whatsappDisplay: '299 658-7715',
  whatsappDigits: '5492996587715',
  whatsappMessage:
    'Hola, vi la presentación rápida y quiero agendar la demo del sistema.',
  email: 'santiagoalvarezz.dev@gmail.com',
} as const

export function whatsappHref(): string {
  return `https://wa.me/${PITCH_CONTACT.whatsappDigits}?text=${encodeURIComponent(PITCH_CONTACT.whatsappMessage)}`
}

export const PITCH_COVER = {
  eyebrow: 'Presentación rápida',
  title: 'Todo lo que tu local puede controlar',
  subtitle:
    'Tickets con tu marca, etiquetas personalizadas y operación completa. En la próxima cita lo vemos en vivo.',
  brand: 'CValleTienda',
  planHint: 'Plan Pro · $45.000/mes',
  visualCaption: 'Ejemplo: ticket TEST TIENDA + etiqueta editable',
} as const

export const PITCH_POINTS: PitchPoint[] = [
  {
    id: 'pos',
    number: 1,
    title: 'POS con scanner',
    body: 'Cobrás en segundos con código de barras — sin buscar el producto a mano.',
    highlights: ['Scanner USB / pistola', 'Búsqueda por nombre', 'Atajos de teclado'],
    plan: 'incluido',
    iconKey: 'pos',
  },
  {
    id: 'pay',
    number: 2,
    title: 'Multi-pago',
    body: 'Efectivo, débito, QR y cuenta corriente en la misma venta.',
    highlights: ['Cobro mixto', 'Vuelto y redondeo', 'Cuenta corriente'],
    plan: 'incluido',
    iconKey: 'pay',
  },
  {
    id: 'ticket',
    number: 3,
    title: 'Tickets con tu marca',
    body: 'Logo, datos del local e impresión térmica automática al cerrar.',
    highlights: ['Logo CloudValle / tuyo', 'Comprobante interno', 'Pie personalizable'],
    plan: 'incluido',
    iconKey: 'ticket',
  },
  {
    id: 'caja',
    number: 4,
    title: 'Caja y turnos',
    body: 'Apertura, movimientos y cierre que cierran con el efectivo real.',
    highlights: ['Apertura / cierre', 'Ingresos y egresos', 'Resumen del turno'],
    plan: 'incluido',
    iconKey: 'caja',
  },
  {
    id: 'stock',
    number: 5,
    title: 'Stock por variantes',
    body: 'Talle, color u otros atributos según tu rubro — el stock baja solo al vender.',
    highlights: ['Variantes por rubro', 'Baja automática', 'Historial de movimientos'],
    plan: 'incluido',
    iconKey: 'stock',
  },
  {
    id: 'alert',
    number: 6,
    title: 'Alertas de stock bajo',
    body: 'Sabés qué reponer antes de quedarte sin mercadería.',
    highlights: ['Umbral configurable', 'Lista prioritaria', 'Evita quiebres'],
    plan: 'incluido',
    iconKey: 'alert',
  },
  {
    id: 'tag',
    number: 7,
    title: 'Etiquetas personalizadas',
    body: 'Diseñás qué mostrar: nombre, precio, talle, color y código de barras.',
    highlights: ['Diseñador visual', 'Tamaño en mm', 'Impresión masiva'],
    plan: 'incluido',
    iconKey: 'tag',
  },
  {
    id: 'clients',
    number: 8,
    title: 'Clientes y CRM',
    body: 'Buscá al cliente en el POS, historial de compras y cuenta corriente.',
    highlights: ['Ficha completa', 'Historial', 'Saldo / fiado'],
    plan: 'incluido',
    iconKey: 'clients',
  },
  {
    id: 'dash',
    number: 9,
    title: 'Dashboard del día',
    body: 'Ventas, ganancia bruta y lo que más se mueve — en una sola pantalla.',
    highlights: ['KPIs en vivo', 'Top productos', 'Stock crítico'],
    plan: 'incluido',
    iconKey: 'dash',
  },
  {
    id: 'chart',
    number: 10,
    title: 'Reportes y gráficos',
    body: 'Visión del mes para decidir con números, no a ojo.',
    highlights: ['Tendencia mensual', 'Ganancia', 'Exportable'],
    plan: 'incluido',
    iconKey: 'chart',
  },
  {
    id: 'return',
    number: 11,
    title: 'Devoluciones',
    body: 'Parcial o total, con stock que vuelve solo al inventario.',
    highlights: ['Parcial / total', 'Reingreso stock', 'Ticket de devolución'],
    plan: 'incluido',
    iconKey: 'return',
  },
  {
    id: 'remito',
    number: 12,
    title: 'Remitos A4',
    body: 'Entregas y envíos con documento profesional listo para imprimir.',
    highlights: ['Formato A4', 'Estados', 'Desde venta o cero'],
    plan: 'incluido',
    iconKey: 'remito',
  },
  {
    id: 'afip',
    number: 13,
    title: 'Factura AFIP',
    body: 'Emisión desde el POS. El abono de TusFacturas lo contrata el comercio aparte.',
    highlights: ['Factura A/B/C', 'CAE + QR', 'TusFacturas aparte'],
    plan: 'incluido',
    iconKey: 'afip',
  },
  {
    id: 'rubro',
    number: 14,
    title: 'Multi-rubro',
    body: 'Ropa, despensa, ferretería y más — el mismo sistema adaptado a tu negocio.',
    highlights: ['9+ rubros', 'Variantes por contexto', 'Misma plataforma'],
    plan: 'incluido',
    iconKey: 'rubro',
  },
  {
    id: 'print',
    number: 15,
    title: 'PrintBridge',
    body: 'Impresión local de tickets y etiquetas sin diálogos raros del navegador.',
    highlights: ['Agente local', 'Térmica + TSPL', 'Sin popups'],
    plan: 'incluido',
    iconKey: 'print',
  },
  {
    id: 'rocket',
    number: 16,
    title: 'Arranque acompañado',
    body: 'Instalación, 3 capacitaciones de 1 hora y los primeros 20 productos cargados.',
    highlights: ['Setup completo', '3×1 h', '20 productos'],
    plan: 'incluido',
    iconKey: 'rocket',
  },
]

export const PITCH_CLOSING = {
  eyebrow: 'Inversión clara',
  title: 'Plan Pro y cómo arrancamos',
  subtitle:
    'Por ahora ofrecemos un solo plan completo. En la próxima cita te muestro el sistema en tu rubro.',
  ctaPrimary: 'Agendar demo por WhatsApp',
  ctaSecondary: PITCH_CONTACT.email,
} as const

export type DeckSlide =
  | { kind: 'cover' }
  | { kind: 'point'; point: PitchPoint }
  | { kind: 'closing' }

export function buildDeckSlides(): DeckSlide[] {
  return [
    { kind: 'cover' },
    ...PITCH_POINTS.map((point) => ({ kind: 'point' as const, point })),
    { kind: 'closing' },
  ]
}
