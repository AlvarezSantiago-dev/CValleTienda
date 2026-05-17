// =============================================================
// lib/remitos/queries.ts
// Consultas Supabase para el módulo de remitos.
// =============================================================

import { createClient } from '@/lib/supabase/server'
import type { Remito, EstadoRemito, TipoRemito, EstadoCobro } from '@/types/database'

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
  return { supabase, tiendaId: perfil.tienda_id as string, userId: auth.user.id }
}

export interface RemitoListItem {
  id: string
  numero_remito: number
  tipo: TipoRemito
  estado: EstadoRemito
  estado_cobro: EstadoCobro
  destinatario: string
  cliente_nombre: string | null
  direccion_entrega: string | null
  fecha_entrega: string | null
  venta_numero: number | null
  monto_total: number
  monto_cobrado: number
  created_at: string
}

export interface RemitoDetalle extends Remito {
  venta_numero: number | null
  usuario_nombre: string | null
  cliente_nombre: string | null
  items: Array<{
    nombre_producto: string
    talla: string | null
    color: string | null
    cantidad: number
    precio_unitario: number
    total_linea: number
  }>
}

export async function listarRemitos(opts?: {
  page?: number
  pageSize?: number
  estado?: EstadoRemito
}): Promise<{ remitos: RemitoListItem[]; total: number }> {
  const { supabase } = await getCtx()
  const page     = Math.max(1, opts?.page     ?? 1)
  const pageSize = Math.max(1, opts?.pageSize ?? 20)
  const from = (page - 1) * pageSize
  const to   = from + pageSize - 1

  let q = supabase
    .from('remitos')
    .select(
      `id, numero_remito, tipo, estado, estado_cobro, destinatario,
       direccion_entrega, fecha_entrega, monto_total, monto_cobrado, created_at,
       venta:ventas(numero_ticket),
       cliente:clientes(nombre)`,
      { count: 'exact' }
    )
    .order('numero_remito', { ascending: false })
    .range(from, to)

  if (opts?.estado) {
    q = q.eq('estado', opts.estado)
  }

  const { data, count } = await q

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>
  const remitos: RemitoListItem[] = rows.map((r) => {
    const venta   = Array.isArray(r.venta)   ? r.venta[0]   : r.venta
    const cliente = Array.isArray(r.cliente) ? r.cliente[0] : r.cliente
    return {
      id:               r.id as string,
      numero_remito:    r.numero_remito as number,
      tipo:             (r.tipo ?? 'entrega') as TipoRemito,
      estado:           r.estado as EstadoRemito,
      estado_cobro:     (r.estado_cobro ?? 'no_aplica') as EstadoCobro,
      destinatario:     r.destinatario as string,
      cliente_nombre:   cliente ? (cliente as Record<string, unknown>).nombre as string : null,
      direccion_entrega: r.direccion_entrega as string | null,
      fecha_entrega:    r.fecha_entrega as string | null,
      venta_numero:     venta ? (venta as Record<string, unknown>).numero_ticket as number : null,
      monto_total:      Number(r.monto_total ?? 0),
      monto_cobrado:    Number(r.monto_cobrado ?? 0),
      created_at:       r.created_at as string,
    }
  })

  return { remitos, total: count ?? 0 }
}

export async function obtenerRemito(id: string): Promise<RemitoDetalle | null> {
  const { supabase } = await getCtx()

  const { data: remito } = await supabase
    .from('remitos')
    .select(`
      *,
      venta:ventas(numero_ticket),
      usuario:perfiles(nombre),
      cliente:clientes(nombre)
    `)
    .eq('id', id)
    .maybeSingle()

  if (!remito) return null

  const r = remito as unknown as Record<string, unknown>
  const venta   = Array.isArray(r.venta)   ? r.venta[0]   : r.venta
  const usuario = Array.isArray(r.usuario) ? r.usuario[0] : r.usuario
  const cliente = Array.isArray(r.cliente) ? r.cliente[0] : r.cliente

  // Priorizar items propios (remito_items); fallback a detalles_venta
  let items: RemitoDetalle['items'] = []

  const { data: propios } = await supabase
    .from('remito_items')
    .select('nombre_producto, talla, color, cantidad, precio_unitario, total_linea')
    .eq('remito_id', id)
    .order('created_at')

  if (propios && propios.length > 0) {
    items = propios as RemitoDetalle['items']
  } else if (r.venta_id) {
    const { data: detalles } = await supabase
      .from('detalles_venta')
      .select('nombre_producto, talla, color, cantidad, precio_unitario, total_linea')
      .eq('venta_id', r.venta_id as string)
      .order('id')
    items = (detalles ?? []) as RemitoDetalle['items']
  }

  return {
    id:               r.id as string,
    tienda_id:        r.tienda_id as string,
    venta_id:         r.venta_id as string | null,
    usuario_id:       r.usuario_id as string | null,
    cliente_id:       r.cliente_id as string | null,
    numero_remito:    r.numero_remito as number,
    tipo:             (r.tipo ?? 'entrega') as TipoRemito,
    estado:           r.estado as EstadoRemito,
    destinatario:     r.destinatario as string,
    direccion_entrega: r.direccion_entrega as string | null,
    telefono_entrega: r.telefono_entrega as string | null,
    observaciones:    r.observaciones as string | null,
    fecha_entrega:    r.fecha_entrega as string | null,
    monto_total:      Number(r.monto_total ?? 0),
    monto_cobrado:    Number(r.monto_cobrado ?? 0),
    estado_cobro:     (r.estado_cobro ?? 'no_aplica') as EstadoCobro,
    fecha_cobro:      r.fecha_cobro as string | null,
    created_at:       r.created_at as string,
    updated_at:       r.updated_at as string,
    venta_numero:     venta ? (venta as Record<string, unknown>).numero_ticket as number : null,
    usuario_nombre:   usuario ? (usuario as Record<string, unknown>).nombre as string : null,
    cliente_nombre:   cliente ? (cliente as Record<string, unknown>).nombre as string : null,
    items,
  }
}

export async function contarRemitosPendientes(): Promise<number> {
  const { supabase } = await getCtx()
  const { count } = await supabase
    .from('remitos')
    .select('*', { count: 'exact', head: true })
    .in('estado', ['borrador', 'emitido'])
  return count ?? 0
}

export async function listarRemitosPendientesCobro(): Promise<{
  remitos: RemitoListItem[]
  totalDeuda: number
}> {
  const { supabase } = await getCtx()
  const { data } = await supabase
    .from('remitos')
    .select(
      `id, numero_remito, tipo, estado, estado_cobro, destinatario,
       direccion_entrega, fecha_entrega, monto_total, monto_cobrado, created_at,
       venta:ventas(numero_ticket),
       cliente:clientes(nombre)`
    )
    .eq('estado_cobro', 'pendiente')
    .order('numero_remito', { ascending: false })

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>
  const remitos: RemitoListItem[] = rows.map((r) => {
    const venta   = Array.isArray(r.venta)   ? r.venta[0]   : r.venta
    const cliente = Array.isArray(r.cliente) ? r.cliente[0] : r.cliente
    return {
      id:               r.id as string,
      numero_remito:    r.numero_remito as number,
      tipo:             (r.tipo ?? 'entrega') as TipoRemito,
      estado:           r.estado as EstadoRemito,
      estado_cobro:     'pendiente' as EstadoCobro,
      destinatario:     r.destinatario as string,
      cliente_nombre:   cliente ? (cliente as Record<string, unknown>).nombre as string : null,
      direccion_entrega: r.direccion_entrega as string | null,
      fecha_entrega:    r.fecha_entrega as string | null,
      venta_numero:     venta ? (venta as Record<string, unknown>).numero_ticket as number : null,
      monto_total:      Number(r.monto_total ?? 0),
      monto_cobrado:    Number(r.monto_cobrado ?? 0),
      created_at:       r.created_at as string,
    }
  })

  const totalDeuda = remitos.reduce((a, r) => a + (r.monto_total - r.monto_cobrado), 0)
  return { remitos, totalDeuda }
}

