import { requireAuthCtx } from '@/lib/supabase/require-ctx'
import type { Cliente } from '@/types/database'

export interface ClienteListItem {
  id: string
  nombre: string
  apellido: string | null
  dni: string | null
  telefono: string | null
  email: string | null
  ciudad: string | null
  tiene_notas: boolean
  total_compras: number
  monto_total: number
  ultima_compra: string | null
  activo: boolean
  created_at: string
  saldo_cc: number
}

export interface ListarClientesOptions {
  search?: string
  incluirInactivos?: boolean
  soloDeuda?: boolean
  page?: number
  pageSize?: number
}

export interface ListarClientesResult {
  items: ClienteListItem[]
  total: number
  pageSize: number
}

const DEFAULT_PAGE_SIZE = 25

async function getCtx() {
  const { supabase, tiendaId } = await requireAuthCtx()
  return { supabase, tiendaId }
}

export async function listarClientes(
  opts: ListarClientesOptions = {}
): Promise<ListarClientesResult> {
  const { supabase, tiendaId } = await getCtx()
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let q = supabase
    .from('clientes')
    .select(
      'id, nombre, apellido, dni, telefono, email, ciudad, notas, total_compras, monto_total, ultima_compra, activo, created_at, saldo_cc',
      { count: 'exact' }
    )
    .eq('tienda_id', tiendaId)

  if (!opts.incluirInactivos) {
    q = q.eq('activo', true)
  }

  if (opts.soloDeuda) {
    q = q.gt('saldo_cc', 0)
  }

  const search = opts.search?.trim()
  if (search) {
    const pat = `%${search}%`
    q = q.or(
      `nombre.ilike.${pat},apellido.ilike.${pat},dni.ilike.${pat},telefono.ilike.${pat},email.ilike.${pat}`
    )
  }

  q = q.order('nombre', { ascending: true }).order('apellido', { ascending: true }).range(from, to)

  const { data, error, count } = await q
  if (error) {
    console.error('listarClientes error', error)
    return { items: [], total: 0, pageSize }
  }

  const items = ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    nombre: (r.nombre as string) ?? '',
    apellido: (r.apellido as string | null) ?? null,
    dni: (r.dni as string | null) ?? null,
    telefono: (r.telefono as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    ciudad: (r.ciudad as string | null) ?? null,
    tiene_notas: !!(r.notas as string | null),
    total_compras: Number(r.total_compras ?? 0),
    monto_total: Number(r.monto_total ?? 0),
    ultima_compra: (r.ultima_compra as string | null) ?? null,
    activo: Boolean(r.activo),
    created_at: r.created_at as string,
    saldo_cc: Number(r.saldo_cc ?? 0),
  }))

  return { items, total: count ?? 0, pageSize }
}

export async function obtenerCliente(id: string): Promise<Cliente | null> {
  const { supabase, tiendaId } = await getCtx()
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('tienda_id', tiendaId)
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return data as unknown as Cliente
}
