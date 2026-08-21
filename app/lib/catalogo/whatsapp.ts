export function soloDigitos(raw: string): string {
  return raw.replace(/\D/g, '')
}

/** Normaliza un móvil argentino a dígitos internacionales (549…). */
export function normalizarWhatsappAR(raw: string): string | null {
  let d = soloDigitos(raw)
  if (!d) return null

  if (d.startsWith('00')) d = d.slice(2)
  if (d.startsWith('54')) {
    if (d.length >= 12 && d.length <= 13) return d
    return d.length >= 11 ? d : null
  }

  if (d.startsWith('9') && d.length === 11) return `54${d}`

  if (d.startsWith('15') && d.length >= 10) {
    const rest = d.slice(2)
    if (rest.length >= 8) return `549${rest}`
  }

  if (d.length === 10) return `549${d}`
  if (d.length === 11 && d.startsWith('11')) return `549${d}`
  if (d.length >= 10 && d.length <= 11) return `54${d}`

  return d.length >= 10 ? d : null
}

export function waMeUrl(digits: string, text: string): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export function armarMensajePedido(input: {
  numero: number
  nombreTienda: string
  clienteNombre: string
  clienteTelefono: string
  tipoEntrega: 'retiro' | 'envio'
  direccion?: string | null
  notas?: string | null
  total: number
  items: Array<{ nombre: string; talla?: string | null; color?: string | null; cantidad: number; total: number }>
}): string {
  const lineas = input.items.map((it) => {
    const extra = [it.color, it.talla].filter(Boolean).join(' ')
    const label = extra ? `${it.nombre} ${extra}` : it.nombre
    return `• ${label} x${it.cantidad}`
  })
  const entrega =
    input.tipoEntrega === 'envio'
      ? `Envío a ${input.direccion?.trim() || 'domicilio'}`
      : 'Retiro en el local'
  const notas = input.notas?.trim() ? `\nNotas: ${input.notas.trim()}` : ''
  const total = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(input.total)

  return [
    `Hola! Quiero hacer el pedido #${input.numero} de ${input.nombreTienda}:`,
    '',
    ...lineas,
    '',
    `Entrega: ${entrega}`,
    `Total: ${total}`,
    `Nombre: ${input.clienteNombre}`,
    `Tel: ${input.clienteTelefono}${notas}`,
  ].join('\n')
}
