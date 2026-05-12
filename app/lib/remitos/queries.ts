// =============================================================
// lib/remitos/queries.ts
// Consultas Supabase para el módulo de remitos.
// =============================================================

import { createClient } from '@/lib/supabase/server'
import type { Remito, EstadoRemito } from '@/types/database'

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
  estado: EstadoRemito
  destinatario: string
  direccion_entrega: string | null
  fecha_entrega: string | null
  venta_numero: number | null
  created_at: string
}

export interface RemitoDetalle extends Remito {
  venta_numero: number | null
  usuario_nombre: string | null
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
      `id, numero_remito, estado, destinatario, direccion_entrega,
       fecha_entrega, created_at,
       venta:ventas(numero_ticket)`,
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
    const venta = Array.isArray(r.venta) ? r.venta[0] : r.venta
    return {
      id:               r.id as string,
      numero_remito:    r.numero_remito as number,
      estado:           r.estado as EstadoRemito,
      destinatario:     r.destinatario as string,
      direccion_entrega: r.direccion_entrega as string | null,
      fecha_entrega:    r.fecha_entrega as string | null,
      venta_numero:     venta ? (venta as Record<string, unknown>).numero_ticket as number : null,
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
      usuario:perfiles(nombre)
    `)
    .eq('id', id)
    .maybeSingle()

  if (!remito) return null

  const r = remito as unknown as Record<string, unknown>
  const venta = Array.isArray(r.venta) ? r.venta[0] : r.venta
  const usuario = Array.isArray(r.usuario) ? r.usuario[0] : r.usuario

  // Obtener ítems del remito desde detalles_venta de la venta asociada
  let items: RemitoDetalle['items'] = []
  if (r.venta_id) {
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
    numero_remito:    r.numero_remito as number,
    estado:           r.estado as EstadoRemito,
    destinatario:     r.destinatario as string,
    direccion_entrega: r.direccion_entrega as string | null,
    telefono_entrega: r.telefono_entrega as string | null,
    observaciones:    r.observaciones as string | null,
    fecha_entrega:    r.fecha_entrega as string | null,
    created_at:       r.created_at as string,
    updated_at:       r.updated_at as string,
    venta_numero:     venta ? (venta as Record<string, unknown>).numero_ticket as number : null,
    usuario_nombre:   usuario ? (usuario as Record<string, unknown>).nombre as string : null,
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
