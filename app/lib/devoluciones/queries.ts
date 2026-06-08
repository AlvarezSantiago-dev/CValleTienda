import { createClient } from '@/lib/supabase/server'
import type { TipoDevolucion, EstadoDevolucion } from '@/types/database'
import { nombreUsuario } from '@/lib/caja/queries'
import { parseNumeroTicketQuery } from '@/lib/tickets/format'

export interface DevolucionListItem {
  id: string
  numero_devolucion: number
  tipo: TipoDevolucion
  estado: EstadoDevolucion
  motivo: string
  total_devuelto: number
  created_at: string
  venta_id: string
  numero_ticket: number | null
  cliente_nombre: string | null
  usuario_nombre: string | null
  cantidad_items: number
}

export interface DevolucionDetalleLinea {
  id: string
  detalle_venta_id: string | null
  variante_id: string | null
  nombre_producto: string
  codigo_barras: string | null
  talla: string | null
  color: string | null
  cantidad: number
  precio_unitario: number
  total_linea: number
}

export interface DevolucionPago {
  id: string
  metodo_pago_id: string | null
  cuenta_fondo_id: string | null
  nombre_metodo: string
  nombre_cuenta: string
  monto: number
  referencia: string | null
}

export interface DevolucionCompleta {
  id: string
  numero_devolucion: number
  tipo: TipoDevolucion
  tipo_resolucion: 'reembolso' | 'saldo_a_favor' | 'cambio'
  estado: EstadoDevolucion
  motivo: string
  total_devuelto: number
  created_at: string
  venta_id: string
  numero_ticket: number | null
  cliente_id: string | null
  cliente_nombre: string | null
  usuario_nombre: string | null
  detalles: DevolucionDetalleLinea[]
  pagos: DevolucionPago[]
}

export interface ListarDevolucionesOptions {
  search?: string
  desde?: string
  hasta?: string
  tipo?: TipoDevolucion
  page?: number
  pageSize?: number
}

export interface ListarDevolucionesResult {
  items: DevolucionListItem[]
  total: number
  pageSize: number
}

export interface SaldoLinea {
  detalle_venta_id: string
  vendida: number
  devuelta: number
  disponible: number
}

const DEFAULT_PAGE_SIZE = 25

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

export async function listarDevoluciones(
  opts: ListarDevolucionesOptions = {}
): Promise<ListarDevolucionesResult> {
  const { supabase, tiendaId } = await getCtx()
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let q = supabase
    .from('devoluciones')
    .select(
      'id, numero_devolucion, tipo, estado, motivo, total_devuelto, created_at, venta_id, ' +
        'venta:ventas(numero_ticket), ' +
        'cliente:clientes(nombre, apellido), ' +
        'usuario:perfiles!devoluciones_usuario_id_fkey(nombre, apellido)',
      { count: 'exact' }
    )
    .eq('tienda_id', tiendaId)

  if (opts.tipo) q = q.eq('tipo', opts.tipo)
  if (opts.desde) q = q.gte('created_at', opts.desde)
  if (opts.hasta) q = q.lte('created_at', opts.hasta)

  const search = opts.search?.trim()
  if (search) {
    const ticket = parseNumeroTicketQuery(search)
    const devNum = /^\d+$/.test(search) ? Number(search) : null

    if (ticket != null) {
      const { data: ventas } = await supabase
        .from('ventas')
        .select('id')
        .eq('tienda_id', tiendaId)
        .eq('numero_ticket', ticket)

      const ventaIds = (ventas ?? []).map((v) => v.id as string)
      const orParts: string[] = []

      if (devNum != null && devNum > 0) {
        orParts.push(`numero_devolucion.eq.${devNum}`)
      }
      if (ventaIds.length > 0) {
        orParts.push(`venta_id.in.(${ventaIds.join(',')})`)
      }

      if (orParts.length > 0) {
        q = q.or(orParts.join(','))
      } else {
        q = q.ilike('motivo', `%${search}%`)
      }
    } else if (devNum != null && devNum > 0) {
      q = q.eq('numero_devolucion', devNum)
    } else {
      q = q.ilike('motivo', `%${search}%`)
    }
  }

  q = q.order('created_at', { ascending: false }).range(from, to)

  const { data, error, count } = await q
  if (error) {
    console.error('listarDevoluciones error', error)
    return { items: [], total: 0, pageSize }
  }

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>
  const ids = rows.map((r) => r.id as string)

  const cantMap = new Map<string, number>()
  if (ids.length > 0) {
    const { data: dets } = await supabase
      .from('detalles_devolucion')
      .select('devolucion_id, cantidad')
      .eq('tienda_id', tiendaId)
      .in('devolucion_id', ids)
    for (const d of ((dets ?? []) as unknown as Array<{ devolucion_id: string; cantidad: number }>)) {
      cantMap.set(d.devolucion_id, (cantMap.get(d.devolucion_id) ?? 0) + Number(d.cantidad))
    }
  }

  const items: DevolucionListItem[] = rows.map((r) => {
    const venta = unwrap(r.venta)
    const cliente = unwrap(r.cliente)
    const usuario = unwrap(r.usuario)
    const cliNombre = cliente
      ? `${(cliente.nombre as string) ?? ''} ${(cliente.apellido as string) ?? ''}`.trim() ||
        null
      : null
    return {
      id: r.id as string,
      numero_devolucion: Number(r.numero_devolucion),
      tipo: r.tipo as TipoDevolucion,
      estado: r.estado as EstadoDevolucion,
      motivo: (r.motivo as string) ?? '',
      total_devuelto: Number(r.total_devuelto ?? 0),
      created_at: r.created_at as string,
      venta_id: r.venta_id as string,
      numero_ticket: venta ? Number(venta.numero_ticket) : null,
      cliente_nombre: cliNombre,
      usuario_nombre: nombreUsuario(
        usuario
          ? {
              id: '',
              nombre: (usuario.nombre as string | null) ?? null,
              apellido: (usuario.apellido as string | null) ?? null,
            }
          : null
      ),
      cantidad_items: cantMap.get(r.id as string) ?? 0,
    }
  })

  return { items, total: count ?? 0, pageSize }
}

export async function obtenerDevolucionCompleta(
  id: string
): Promise<DevolucionCompleta | null> {
  const { supabase, tiendaId } = await getCtx()
  const { data, error } = await supabase
    .from('devoluciones')
    .select(
      'id, numero_devolucion, tipo, tipo_resolucion, estado, motivo, total_devuelto, created_at, venta_id, cliente_id, ' +
        'venta:ventas(numero_ticket), ' +
        'cliente:clientes(id, nombre, apellido), ' +
        'usuario:perfiles!devoluciones_usuario_id_fkey(nombre, apellido)'
    )
    .eq('tienda_id', tiendaId)
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  const r = data as unknown as Record<string, unknown>

  const { data: detallesRaw } = await supabase
    .from('detalles_devolucion')
    .select('*')
    .eq('tienda_id', tiendaId)
    .eq('devolucion_id', id)
    .order('created_at', { ascending: true })

  const { data: pagosRaw } = await supabase
    .from('pagos_devolucion')
    .select('*')
    .eq('tienda_id', tiendaId)
    .eq('devolucion_id', id)
    .order('created_at', { ascending: true })

  const venta = unwrap(r.venta)
  const cliente = unwrap(r.cliente)
  const usuario = unwrap(r.usuario)
  const cliNombre = cliente
    ? `${(cliente.nombre as string) ?? ''} ${(cliente.apellido as string) ?? ''}`.trim() || null
    : null

  const detalles: DevolucionDetalleLinea[] = (
    (detallesRaw ?? []) as unknown as Array<Record<string, unknown>>
  ).map((d) => ({
    id: d.id as string,
    detalle_venta_id: (d.detalle_venta_id as string | null) ?? null,
    variante_id: (d.variante_id as string | null) ?? null,
    nombre_producto: d.nombre_producto as string,
    codigo_barras: (d.codigo_barras as string | null) ?? null,
    talla: (d.talla as string | null) ?? null,
    color: (d.color as string | null) ?? null,
    cantidad: Number(d.cantidad),
    precio_unitario: Number(d.precio_unitario),
    total_linea: Number(d.total_linea),
  }))

  const pagos: DevolucionPago[] = (
    (pagosRaw ?? []) as unknown as Array<Record<string, unknown>>
  ).map((p) => ({
    id: p.id as string,
    metodo_pago_id: (p.metodo_pago_id as string | null) ?? null,
    cuenta_fondo_id: (p.cuenta_fondo_id as string | null) ?? null,
    nombre_metodo: p.nombre_metodo as string,
    nombre_cuenta: p.nombre_cuenta as string,
    monto: Number(p.monto),
    referencia: (p.referencia as string | null) ?? null,
  }))

  return {
    id: r.id as string,
    numero_devolucion: Number(r.numero_devolucion),
    tipo: r.tipo as TipoDevolucion,
    tipo_resolucion: ((r.tipo_resolucion as string) ?? 'reembolso') as 'reembolso' | 'saldo_a_favor' | 'cambio',
    estado: r.estado as EstadoDevolucion,
    motivo: (r.motivo as string) ?? '',
    total_devuelto: Number(r.total_devuelto ?? 0),
    created_at: r.created_at as string,
    venta_id: r.venta_id as string,
    numero_ticket: venta ? Number(venta.numero_ticket) : null,
    cliente_id: (r.cliente_id as string | null) ?? null,
    cliente_nombre: cliNombre,
    usuario_nombre: nombreUsuario(
      usuario
        ? {
            id: '',
            nombre: (usuario.nombre as string | null) ?? null,
            apellido: (usuario.apellido as string | null) ?? null,
          }
        : null
    ),
    detalles,
    pagos,
  }
}

export async function obtenerDevolucionesPorVenta(
  ventaId: string
): Promise<DevolucionListItem[]> {
  const { supabase, tiendaId } = await getCtx()
  const { data, error } = await supabase
    .from('devoluciones')
    .select(
      'id, numero_devolucion, tipo, estado, motivo, total_devuelto, created_at, venta_id, ' +
        'venta:ventas(numero_ticket), ' +
        'cliente:clientes(nombre, apellido), ' +
        'usuario:perfiles!devoluciones_usuario_id_fkey(nombre, apellido)'
    )
    .eq('tienda_id', tiendaId)
    .eq('venta_id', ventaId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  const rows = data as unknown as Array<Record<string, unknown>>
  const ids = rows.map((r) => r.id as string)

  const cantMap = new Map<string, number>()
  if (ids.length > 0) {
    const { data: dets } = await supabase
      .from('detalles_devolucion')
      .select('devolucion_id, cantidad')
      .eq('tienda_id', tiendaId)
      .in('devolucion_id', ids)
    for (const d of ((dets ?? []) as unknown as Array<{ devolucion_id: string; cantidad: number }>)) {
      cantMap.set(d.devolucion_id, (cantMap.get(d.devolucion_id) ?? 0) + Number(d.cantidad))
    }
  }

  return rows.map((r) => {
    const venta = unwrap(r.venta)
    const cliente = unwrap(r.cliente)
    const usuario = unwrap(r.usuario)
    return {
      id: r.id as string,
      numero_devolucion: Number(r.numero_devolucion),
      tipo: r.tipo as TipoDevolucion,
      estado: r.estado as EstadoDevolucion,
      motivo: (r.motivo as string) ?? '',
      total_devuelto: Number(r.total_devuelto ?? 0),
      created_at: r.created_at as string,
      venta_id: r.venta_id as string,
      numero_ticket: venta ? Number(venta.numero_ticket) : null,
      cliente_nombre: cliente
        ? `${(cliente.nombre as string) ?? ''} ${(cliente.apellido as string) ?? ''}`.trim() ||
          null
        : null,
      usuario_nombre: nombreUsuario(
        usuario
          ? {
              id: '',
              nombre: (usuario.nombre as string | null) ?? null,
              apellido: (usuario.apellido as string | null) ?? null,
            }
          : null
      ),
      cantidad_items: cantMap.get(r.id as string) ?? 0,
    }
  })
}

/**
 * Para cada `detalle_venta_id` de la venta, devuelve cuánto se vendió,
 * cuánto ya se devolvió y cuánto queda disponible para devolver.
 */
export async function calcularSaldoDevolverPorLinea(
  ventaId: string
): Promise<Map<string, SaldoLinea>> {
  const { supabase, tiendaId } = await getCtx()

  const { data: detallesVenta } = await supabase
    .from('detalles_venta')
    .select('id, cantidad')
    .eq('tienda_id', tiendaId)
    .eq('venta_id', ventaId)

  const map = new Map<string, SaldoLinea>()
  for (const d of ((detallesVenta ?? []) as Array<{ id: string; cantidad: number }>)) {
    map.set(d.id, {
      detalle_venta_id: d.id,
      vendida: Number(d.cantidad),
      devuelta: 0,
      disponible: Number(d.cantidad),
    })
  }

  if (map.size === 0) return map

  // Sumar lo ya devuelto vinculado a estos detalles_venta
  // Solo devoluciones completadas (las anuladas no cuentan)
  const { data: detallesDev } = await supabase
    .from('detalles_devolucion')
    .select(
      'detalle_venta_id, cantidad, devolucion:devoluciones!inner(id, estado, venta_id)'
    )
    .eq('tienda_id', tiendaId)

  for (const d of ((detallesDev ?? []) as unknown as Array<Record<string, unknown>>)) {
    const dvId = d.detalle_venta_id as string | null
    if (!dvId) continue
    const dev = unwrap(d.devolucion)
    if (!dev) continue
    if (dev.estado !== 'completada') continue
    if (dev.venta_id !== ventaId) continue
    const saldo = map.get(dvId)
    if (!saldo) continue
    saldo.devuelta += Number(d.cantidad)
    saldo.disponible = Math.max(0, saldo.vendida - saldo.devuelta)
  }

  return map
}
