'use strict'

/**
 * Convierte payloads JSON (mismos que usa la web app) a comandos ESC/POS.
 * Replica la lógica de TicketVentaRenderer.tsx pero para impresora térmica.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatARS(n, sym = '$') {
  if (typeof n !== 'number') n = parseFloat(n) || 0
  const fixed = n.toFixed(2)
  const [int, dec] = fixed.split('.')
  const intSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${sym} ${intSep},${dec}`
}

function pad(str, len, right = false) {
  const s = String(str ?? '')
  if (right) return s.padStart(len, ' ')
  return s.padEnd(len, ' ')
}

function separator(printer) {
  printer.drawLine()
}

// Elimina ¡ y ¿ que se corrompen en la codificación ESC/POS
function sanitize(str) {
  if (!str) return ''
  return str.replace(/[¡¿]/g, '')
}

// Imprime fila izquierda/derecha con padding exacto (sin overflow por flotante)
// rightFraction: fracción de la línea para la columna derecha (default 0.43)
function printRow(printer, leftText, rightText, rightFraction) {
  const total = printer.getWidth()
  const rightW = Math.round(total * (rightFraction ?? 0.43))
  const leftW = total - rightW
  const left = String(leftText).padEnd(leftW)
  const right = String(rightText).padStart(rightW)
  printer.println(left + right)
}

// ─── Ticket de Venta ─────────────────────────────────────────────────────────

async function renderTicketVenta(printer, payload) {
  const t = payload.tienda
  const sym = t.simbolo_moneda || '$'

  // Font B para 58mm: letra más chica → 42 chars efectivos (igual que 76mm en Font A)
  if ((t.ancho_mm ?? 80) === 58) printer.setTypeFontB()

  // Encabezado tienda
  printer.alignCenter()
  printer.bold(true)
  printer.setTextSize(1, 1)
  printer.println((t.razon_social || t.nombre || 'Mi Tienda').toUpperCase())
  printer.bold(false)
  printer.setTextNormal()
  if (t.cuit) printer.println(`CUIT: ${t.cuit}`)
  if (t.condicion_iva) printer.println(t.condicion_iva)
  if (t.direccion_legal || t.direccion) printer.println(t.direccion_legal || t.direccion)
  if (t.telefono) printer.println(`Tel: ${t.telefono}`)
  if (t.texto_encabezado) {
    t.texto_encabezado.split('\n').forEach((l) => printer.println(sanitize(l)))
  }

  separator(printer)

  // Disclaimer: comprobante interno (solo cuando no hay factura AFIP)
  if (!payload.factura) {
    printer.alignCenter()
    printer.bold(true)
    printer.println('COMPROBANTE INTERNO')
    printer.bold(false)
    printer.println('NO VALIDO COMO FACTURA')
    separator(printer)
  }

  // Datos del ticket
  printer.alignLeft()
  printer.println('')
  printer.println(`Ticket ${payload.numero_ticket}`)
  printer.println(payload.fecha)
  if (payload.vendedor) printer.println(`Atendio: ${payload.vendedor}`)
  if (payload.cliente) {
    const cli = payload.cliente
    printer.println(
      `Cliente: ${cli.nombre}${cli.dni ? ` · DNI ${cli.dni}` : ''}`
    )
  }
  printer.println('')

  separator(printer)

  // Líneas de productos — 2 líneas por ítem para evitar overflow
  for (const ln of payload.lineas) {
    const variantStr = [ln.talla, ln.color].filter(Boolean).join('/')
    const nombre = ln.nombre_producto + (variantStr ? ` (${variantStr})` : '')
    printer.alignLeft()
    printer.println(`${ln.cantidad}x ${nombre}`)
    printRow(printer, `   ${formatARS(ln.precio_unitario, sym)} c/u`, formatARS(ln.total_linea, sym))
  }

  separator(printer)

  // Totales
  printRow(printer, 'Subtotal', formatARS(payload.subtotal, sym))
  if (payload.descuento > 0) {
    printRow(printer, 'Descuento', `-${formatARS(payload.descuento, sym)}`)
  }
  printer.bold(true)
  printRow(printer, 'TOTAL', formatARS(payload.total, sym))
  printer.bold(false)

  separator(printer)

  // Pagos
  for (const p of payload.pagos) {
    const label = p.nombre_metodo + (p.referencia ? ` (${p.referencia})` : '')
    printRow(printer, label, formatARS(p.monto, sym))
  }

  // Observaciones
  if (payload.observaciones) {
    separator(printer)
    printer.println(`Obs: ${payload.observaciones}`)
  }

  // Factura electrónica AFIP
  if (payload.factura) {
    separator(printer)
    printer.alignCenter()
    printer.bold(true)
    printer.println(`FACTURA ELECTRONICA ${payload.factura.tipo_comprobante}`)
    printer.bold(false)
    printer.println(`N° ${payload.factura.numero_comprobante}`)
    printer.println(`CAE: ${payload.factura.cae}`)
    printer.println(`Vence: ${payload.factura.cae_vencimiento}`)
    printer.alignLeft()
  }

  // Pie de tienda
  if (t.texto_pie) {
    separator(printer)
    printer.alignCenter()
    t.texto_pie.split('\n').forEach((l) => printer.println(sanitize(l)))
  }

  // Cierre — solo mostrar si no hay texto_pie para evitar duplicado
  printer.alignCenter()
  printer.println('')
  if (!t.texto_pie) printer.println('Gracias por tu compra!')
  printer.println('')
}

// ─── Ticket de Devolución ─────────────────────────────────────────────────────

async function renderTicketDevolucion(printer, payload) {
  const t = payload.tienda
  const sym = t.simbolo_moneda || '$'

  // Font B para 58mm
  if ((t.ancho_mm ?? 80) === 58) printer.setTypeFontB()

  printer.alignCenter()
  printer.bold(true)
  printer.println((t.razon_social || t.nombre || 'Mi Tienda').toUpperCase())
  printer.bold(false)
  if (t.cuit) printer.println(`CUIT: ${t.cuit}`)
  if (t.direccion_legal || t.direccion) printer.println(t.direccion_legal || t.direccion)

  separator(printer)

  printer.alignCenter()
  printer.bold(true)
  printer.println('DEVOLUCION')
  printer.println('COMPROBANTE INTERNO')
  printer.println('NO VALIDO COMO FACTURA')
  printer.bold(false)
  printer.alignLeft()
  printer.println(`N° ${payload.numero_devolucion}   ${payload.fecha}`)
  printer.println(`Venta ref: ${payload.venta_referencia}`)
  if (payload.vendedor) printer.println(`Atendio: ${payload.vendedor}`)
  if (payload.cliente) printer.println(`Cliente: ${payload.cliente.nombre}`)

  separator(printer)

  for (const ln of payload.lineas) {
    const variantStr = [ln.talla, ln.color].filter(Boolean).join('/')
    const nombre = ln.nombre_producto + (variantStr ? ` (${variantStr})` : '')
    printer.alignLeft()
    printer.println(`${ln.cantidad}x ${nombre}`)
    printRow(printer, '', formatARS(ln.total_linea, sym))
  }

  separator(printer)

  printer.bold(true)
  printRow(printer, 'REINTEGRO', formatARS(payload.total_reintegro, sym))
  printer.bold(false)

  if (payload.motivo) {
    separator(printer)
    printer.println(`Motivo: ${payload.motivo}`)
  }

  if (t.texto_pie) {
    separator(printer)
    printer.alignCenter()
    t.texto_pie.split('\n').forEach((l) => printer.println(l))
  }

  printer.alignCenter()
  printer.println('')
}

// ─── Cierre de Caja ──────────────────────────────────────────────────────────

async function renderCierreCaja(printer, payload) {
  const sym = '$'

  // Font B para 58mm
  if ((payload.tienda?.ancho_mm ?? 80) === 58) printer.setTypeFontB()

  printer.alignCenter()
  printer.bold(true)
  printer.println(
    (payload.tienda?.razon_social || payload.tienda?.nombre || 'Mi Tienda').toUpperCase()
  )
  printer.bold(false)
  if (payload.tienda?.cuit) printer.println(`CUIT: ${payload.tienda.cuit}`)

  separator(printer)

  printer.bold(true)
  printer.println('CIERRE DE CAJA')
  printer.bold(false)
  printer.alignLeft()
  printer.println(`Apertura: ${payload.fecha_apertura}`)
  printer.println(`Cierre:   ${payload.fecha_cierre}`)
  if (payload.usuario) printer.println(`Cajero:   ${payload.usuario}`)

  separator(printer)

  printRow(printer, 'Ventas (cant.)', String(payload.total_ventas_cantidad), 0.30)
  printRow(printer, 'Ventas (monto)', formatARS(payload.total_ventas_monto, sym), 0.30)
  printRow(printer, 'Devol. (cant.)', String(payload.total_devoluciones_cantidad), 0.30)
  printRow(printer, 'Devol. (monto)', formatARS(payload.total_devoluciones_monto, sym), 0.30)

  printer.bold(true)
  printRow(printer, 'NETO', formatARS(payload.total_neto, sym), 0.30)
  printer.bold(false)

  separator(printer)

  printRow(printer, 'Apertura efectivo', formatARS(payload.monto_apertura_efectivo, sym), 0.30)
  printRow(printer, 'Esperado en caja', formatARS(payload.efectivo_esperado, sym), 0.30)
  if (payload.efectivo_declarado != null) {
    printRow(printer, 'Declarado', formatARS(payload.efectivo_declarado, sym), 0.30)
  }
  if (payload.diferencia_efectivo != null) {
    printer.bold(true)
    printRow(printer, 'Diferencia', formatARS(payload.diferencia_efectivo, sym), 0.30)
    printer.bold(false)
  }

  if (payload.detalle_por_cuenta?.length > 0) {
    separator(printer)
    printer.println('Detalle por cuenta:')
    for (const d of payload.detalle_por_cuenta) {
      printer.println('')
      printer.bold(true)
      printer.println(d.nombre_cuenta)
      printer.bold(false)
      printRow(printer, '  Ingresos', formatARS(d.total_ingresos, sym), 0.30)
      printRow(printer, '  Egresos', formatARS(d.total_egresos, sym), 0.30)
      if (d.comision > 0) printRow(printer, '  Comision', formatARS(d.comision, sym), 0.30)
      printRow(printer, '  Neto', formatARS(d.total_neto, sym), 0.30)
      printRow(printer, '  Saldo', formatARS(d.saldo_nuevo, sym), 0.30)
    }
  }

  if (payload.observaciones) {
    separator(printer)
    printer.println(`Obs: ${payload.observaciones}`)
  }

  printer.alignCenter()
  printer.println('')
  printer.println('Comprobante interno')
  printer.println('')
}

// ─── Etiqueta de Producto ────────────────────────────────────────────────────

async function renderEtiqueta(printer, payload) {
  const sym = payload.tienda?.simbolo_moneda || '$'
  // payload.items es array de { nombre, talla, color, codigo_barras, precio, cantidad }
  const items = payload.items || [payload]

  for (const item of items) {
    printer.alignCenter()
    printer.bold(true)
    printer.println(item.nombre_producto || item.nombre || '')
    printer.bold(false)

    const variant = [item.talla, item.color].filter(Boolean).join(' / ')
    if (variant) printer.println(variant)

    if (item.codigo_barras) printer.println(item.codigo_barras)

    if (item.precio != null) {
      printer.bold(true)
      printer.setTextSize(1, 0)
      printer.println(formatARS(item.precio, sym))
      printer.bold(false)
      printer.setTextNormal()
    }

    printer.println('')
    if (payload.autocut !== false) printer.partialCut()
  }
}

// ─── Vale de Cambio ───────────────────────────────────────────────────────────

async function renderValeCambio(printer, payload) {
  const t = payload.tienda
  const dias = t.dias_cambio
  const sym = t.simbolo_moneda || '$'

  if (!dias || dias <= 0) return

  // Font B para 58mm
  if ((t.ancho_mm ?? 80) === 58) printer.setTypeFontB()

  // Encabezado con doble línea
  printer.alignCenter()
  printer.bold(true)
  printer.println((t.razon_social || t.nombre || 'Mi Tienda').toUpperCase())
  printer.println('VALE DE CAMBIO')
  printer.bold(false)
  separator(printer)

  // Referencia al ticket
  printer.alignLeft()
  printer.println(`Ticket: ${payload.numero_ticket}`)
  printer.println(`Fecha:  ${payload.fecha.split(' ')[0]}`)
  separator(printer)

  // Artículos — solo cantidad × nombre (compacto, sin precios)
  for (const ln of payload.lineas) {
    const variantStr = [ln.talla, ln.color].filter(Boolean).join('/')
    const nombre = ln.nombre_producto + (variantStr ? ` (${variantStr})` : '')
    printer.println(`${ln.cantidad}x ${nombre}`)
  }

  separator(printer)

  // Total
  printRow(printer, 'Total:', formatARS(payload.total, sym))

  separator(printer)

  // Fecha límite
  const [dd, mm, yyyy] = payload.fecha.split(' ')[0].split('/')
  const base = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
  base.setDate(base.getDate() + dias)
  const fechaLimite = base.toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })

  printer.alignCenter()
  printer.bold(true)
  printer.println(`VALIDO HASTA: ${fechaLimite}`)
  printer.bold(false)
  printer.println(`(${dias} dias con ticket)`)
  separator(printer)
  printer.println('Conservar este comprobante')
  printer.println('')
}

module.exports = {
  renderTicketVenta,
  renderTicketDevolucion,
  renderCierreCaja,
  renderEtiqueta,
  renderValeCambio,
}
