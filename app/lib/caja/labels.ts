const LABELS_TIPO_CUENTA: Record<string, string> = {
  efectivo: 'Efectivo',
  mercado_pago: 'Mercado Pago',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  banco: 'Banco',
  otro: 'Otro',
}

const LABELS_TIPO_MOVIMIENTO: Record<string, string> = {
  ingreso: 'Ingreso',
  egreso: 'Egreso',
  ajuste: 'Ajuste',
}

export function labelTipoCuenta(tipo: string): string {
  if (!tipo) return '—'
  return LABELS_TIPO_CUENTA[tipo] ?? tipo.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function labelTipoMovimiento(tipo: string): string {
  if (!tipo) return '—'
  return LABELS_TIPO_MOVIMIENTO[tipo] ?? tipo
}
