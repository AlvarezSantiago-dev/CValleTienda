import { createClient } from '@/lib/supabase/server'

export interface VentaListItem {
  id: string
  numero_ticket: number
  total: number
  estado: string
  created_at: string
  cliente_nombre: string | null
  usuario_nombre: string | null
  cantidad_items: number
  /** 'A' | 'B' | 'C' si se emitió factura electrónica, null = Ticket X */
  tipo_comprobante: 'A' | 'B' | 'C' | null
  numero_comprobante: string | null
  cae: string | null
}

export interface VentaDetalle {
  id: string
  variante_id: string | null
  nombre_producto: string
  codigo_barras: string | null
  talla: string | null
  color: string | null
  cantidad: number
  precio_unitario: number
  descuento_linea: number
  total_linea: number
  costo_unitario: number
}

export interface VentaDetalleConSaldo extends VentaDetalle {
  cantidad_devuelta: number
  disponible_devolver: number
}

export interface VentaPago {
  id: string
  metodo_pago_id: string | null
  cuenta_fondo_id: string | null
  nombre_metodo: string
  nombre_cuenta_fondo: string
  monto: number
  comision_calculada: number
  monto_neto: number
  referencia: string | null
}

export interface VentaCompleta {
  id: string
  numero_ticket: number
  subtotal: number
  descuento: number
  total: number
  estado: string
  observaciones: string | null
  created_at: string
  cliente_id: string | null
  cliente_nombre: string | null
  cliente_dni: string | null
  cliente_telefono: string | null
  usuario_nombre: string | null
  detalles: VentaDetalle[]
  pagos: VentaPago[]
  /** Facturación electrónica AFIP */
  tipo_comprobante: 'A' | 'B' | 'C' | null
  numero_comprobante: string | null
  cae: string | null
  cae_vencimiento: string | null
  qr_afip: string | null
  pdf_url: string | null
  cuit_receptor: string | null
}

export interface ListarVentasResult {
  ventas: VentaListItem[]
  total: number
}

async function getCtx() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('No autenticado')
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!perfil) throw new Error('Perfil no encontrado')
  return { supabase, tiendaId: perfil.tienda_id as string }
}

function unwrap(v: unknown): Record<string, unknown> | null {
  if (!v) return null
  if (Array.isArray(v)) return (v[0] as Record<string, unknown>) ?? null
  return v as Record<string, unknown>
}

export async function listarVentas({
  page = 1,
  pageSize = 20,
  clienteId,
}: {
  page?: number
  pageSize?: number
  clienteId?: string
} = {}): Promise<ListarVentasResult> {
  const { supabase, tiendaId } = await getCtx()

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let q = supabase
    .from('ventas')
    .select(
      'id, numero_ticket, total, estado, created_at, tipo_comprobante, numero_comprobante, cae, cliente:clientes(nombre, apellido), usuario:perfiles!ventas_usuario_id_fkey(nombre, apellido)',
      { count: 'exact' }
    )
    .eq('tienda_id', tiendaId)

  if (clienteId) q = q.eq('cliente_id', clienteId)

  const { data, error, count } = await q
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('listarVentas error', error)
    return { ventas: [], total: 0 }
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>
  const ids = rows.map((r) => r.id as string)

  // Cantidad de líneas por venta
  const cantMap = new Map<string, number>()
  if (ids.length > 0) {
    const { data: dets } = await supabase
      .from('detalles_venta')
      .select('venta_id, cantidad')
      .eq('tienda_id', tiendaId)
      .in('venta_id', ids)
    for (const d of (dets ?? []) as Array<{ venta_id: string; cantidad: number }>) {
      cantMap.set(d.venta_id, (cantMap.get(d.venta_id) ?? 0) + Number(d.cantidad))
    }
  }

  const ventas: VentaListItem[] = rows.map((r) => {
    const cliente = unwrap(r.cliente)
    const usuario = unwrap(r.usuario)
    const nombreCli = cliente
      ? `${(cliente.nombre as string) ?? ''} ${(cliente.apellido as string) ?? ''}`.trim() ||
        null
      : null
    const nombreUsr = usuario
      ? `${(usuario.nombre as string) ?? ''} ${(usuario.apellido as string) ?? ''}`.trim() || null
      : null
    return {
      id: r.id as string,
      numero_ticket: Number(r.numero_ticket),
      total: Number(r.total),
      estado: r.estado as string,
      created_at: r.created_at as string,
      cliente_nombre: nombreCli,
      usuario_nombre: nombreUsr,
      cantidad_items: cantMap.get(r.id as string) ?? 0,
      tipo_comprobante: (r.tipo_comprobante as 'A' | 'B' | 'C' | null) ?? null,
      numero_comprobante: (r.numero_comprobante as string | null) ?? null,
      cae: (r.cae as string | null) ?? null,
    }
  })

  return { ventas, total: count ?? 0 }
}

export async function obtenerVentaCompleta(id: string): Promise<VentaCompleta | null> {
  const { supabase, tiendaId } = await getCtx()

  const { data, error } = await supabase
    .from('ventas')
    .select(
      'id, numero_ticket, subtotal, descuento, total, estado, observaciones, created_at, cliente_id, ' +
        'tipo_comprobante, numero_comprobante, cae, cae_vencimiento, qr_afip, pdf_url, cuit_receptor, ' +
        'cliente:clientes(id, nombre, apellido, dni, telefono), ' +
        'usuario:perfiles!ventas_usuario_id_fkey(nombre, apellido)'
    )
    .eq('tienda_id', tiendaId)
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null
  const v = data as unknown as Record<string, unknown>

  const { data: detallesRaw } = await supabase
    .from('detalles_venta')
    .select('*')
    .eq('tienda_id', tiendaId)
    .eq('venta_id', id)
    .order('created_at', { ascending: true })

  const { data: pagosRaw } = await supabase
    .from('pagos_venta')
    .select('*')
    .eq('tienda_id', tiendaId)
    .eq('venta_id', id)
    .order('created_at', { ascending: true })

  const cliente = unwrap(v.cliente)
  const usuario = unwrap(v.usuario)
  const nombreCli = cliente
    ? `${(cliente.nombre as string) ?? ''} ${(cliente.apellido as string) ?? ''}`.trim() || null
    : null

  const detalles: VentaDetalle[] = ((detallesRaw ?? []) as unknown as Array<Record<string, unknown>>).map(
    (d) => ({
      id: d.id as string,
      variante_id: (d.variante_id as string | null) ?? null,
      nombre_producto: d.nombre_producto as string,
      codigo_barras: (d.codigo_barras as string | null) ?? null,
      talla: (d.talla as string | null) ?? null,
      color: (d.color as string | null) ?? null,
      cantidad: Number(d.cantidad),
      precio_unitario: Number(d.precio_unitario),
      descuento_linea: Number(d.descuento_linea ?? 0),
      total_linea: Number(d.total_linea),
      costo_unitario: Number(d.costo_unitario ?? 0),
    })
  )

  const pagos: VentaPago[] = ((pagosRaw ?? []) as unknown as Array<Record<string, unknown>>).map((p) => ({
    id: p.id as string,
    metodo_pago_id: (p.metodo_pago_id as string | null) ?? null,
    cuenta_fondo_id: (p.cuenta_fondo_id as string | null) ?? null,
    nombre_metodo: p.nombre_metodo as string,
    nombre_cuenta_fondo: p.nombre_cuenta_fondo as string,
    monto: Number(p.monto),
    comision_calculada: Number(p.comision_calculada ?? 0),
    monto_neto: Number(p.monto_neto ?? 0),
    referencia: (p.referencia as string | null) ?? null,
  }))

  return {
    id: v.id as string,
    numero_ticket: Number(v.numero_ticket),
    subtotal: Number(v.subtotal),
    descuento: Number(v.descuento),
    total: Number(v.total),
    estado: v.estado as string,
    observaciones: (v.observaciones as string | null) ?? null,
    created_at: v.created_at as string,
    cliente_id: (v.cliente_id as string | null) ?? null,
    cliente_nombre: nombreCli,
    cliente_dni: (cliente?.dni as string | null) ?? null,
    cliente_telefono: (cliente?.telefono as string | null) ?? null,
    usuario_nombre: usuario
      ? `${(usuario.nombre as string) ?? ''} ${(usuario.apellido as string) ?? ''}`.trim() || null
      : null,
    detalles,
    pagos,
    tipo_comprobante: (v.tipo_comprobante as 'A' | 'B' | 'C' | null) ?? null,
    numero_comprobante: (v.numero_comprobante as string | null) ?? null,
    cae: (v.cae as string | null) ?? null,
    cae_vencimiento: (v.cae_vencimiento as string | null) ?? null,
    qr_afip: (v.qr_afip as string | null) ?? null,
    pdf_url: (v.pdf_url as string | null) ?? null,
    cuit_receptor: (v.cuit_receptor as string | null) ?? null,
  }
}

export interface VentaParaDevolucion extends Omit<VentaCompleta, 'detalles'> {
  detalles: VentaDetalleConSaldo[]
  /** Suma total de unidades aún disponibles para devolver */
  total_disponible_devolver: number
  /** Cantidad total vendida (suma de líneas) */
  total_unidades_vendidas: number
}

/**
 * Carga la venta completa y enriquece cada línea con `cantidad_devuelta`
 * y `disponible_devolver` consultando `detalles_devolucion` agregado.
 */
export async function obtenerVentaParaDevolucion(
  id: string
): Promise<VentaParaDevolucion | null> {
  const venta = await obtenerVentaCompleta(id)
  if (!venta) return null

  const { supabase, tiendaId } = await getCtx()

  const detalleIds = venta.detalles.map((d) => d.id)
  const devuelto = new Map<string, number>()

  if (detalleIds.length > 0) {
    const { data: detallesDev } = await supabase
      .from('detalles_devolucion')
      .select(
        'detalle_venta_id, cantidad, devolucion:devoluciones!inner(estado)'
      )
      .eq('tienda_id', tiendaId)
      .in('detalle_venta_id', detalleIds)

    for (const d of ((detallesDev ?? []) as unknown as Array<Record<string, unknown>>)) {
      const dev = unwrap(d.devolucion)
      if (!dev || dev.estado !== 'completada') continue
      const dvId = d.detalle_venta_id as string | null
      if (!dvId) continue
      devuelto.set(dvId, (devuelto.get(dvId) ?? 0) + Number(d.cantidad))
    }
  }

  let totalDisponible = 0
  let totalVendidas = 0
  const detalles: VentaDetalleConSaldo[] = venta.detalles.map((d) => {
    const dv = devuelto.get(d.id) ?? 0
    const disp = Math.max(0, d.cantidad - dv)
    totalDisponible += disp
    totalVendidas += d.cantidad
    return { ...d, cantidad_devuelta: dv, disponible_devolver: disp }
  })

  return {
    ...venta,
    detalles,
    total_disponible_devolver: totalDisponible,
    total_unidades_vendidas: totalVendidas,
  }
}
