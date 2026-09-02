import { createClient } from '@/lib/supabase/server'
import type {
  EstadoPedidoCatalogo,
  PedidoCatalogo,
  PedidoCatalogoItem,
  Notificacion,
  CondicionPago,
} from '@/types/database'
import type { FiltroPedidos } from './types'
import { mapTramoDb, type TramoCantidad } from '@/lib/precios/tramos-cantidad'

async function requireTiendaId(): Promise<{ supabase: Awaited<ReturnType<typeof createClient>>; tiendaId: string } | null> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!perfil) return null
  return { supabase, tiendaId: perfil.tienda_id as string }
}

function mapPedido(r: Record<string, unknown>): PedidoCatalogo {
  return {
    id: r.id as string,
    tienda_id: r.tienda_id as string,
    numero: Number(r.numero),
    estado: r.estado as EstadoPedidoCatalogo,
    cliente_nombre: r.cliente_nombre as string,
    cliente_telefono: r.cliente_telefono as string,
    cliente_id: (r.cliente_id as string | null) ?? null,
    tipo_entrega: r.tipo_entrega as PedidoCatalogo['tipo_entrega'],
    direccion_entrega: (r.direccion_entrega as string | null) ?? null,
    notas: (r.notas as string | null) ?? null,
    subtotal: Number(r.subtotal ?? 0),
    total: Number(r.total ?? 0),
    venta_id: (r.venta_id as string | null) ?? null,
    remito_id: (r.remito_id as string | null) ?? null,
    condicion_pago:
      (r.condicion_pago as CondicionPago) === 'cuenta_corriente' ? 'cuenta_corriente' : 'contado',
    created_at: r.created_at as string,
    updated_at: r.updated_at as string,
  }
}

function mapItem(r: Record<string, unknown>): PedidoCatalogoItem {
  return {
    id: r.id as string,
    tienda_id: r.tienda_id as string,
    pedido_id: r.pedido_id as string,
    variante_id: (r.variante_id as string | null) ?? null,
    producto_nombre: r.producto_nombre as string,
    talla: (r.talla as string | null) ?? null,
    color: (r.color as string | null) ?? null,
    cantidad: Number(r.cantidad),
    precio_unitario: Number(r.precio_unitario),
    total_linea: Number(r.total_linea),
    imagen_url: (r.imagen_url as string | null) ?? null,
    pack_id: (r.pack_id as string | null) ?? null,
    pack_unidades: r.pack_unidades != null ? Number(r.pack_unidades) : null,
  }
}

async function hidratarItemsPedido(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tiendaId: string,
  items: PedidoCatalogoItem[]
): Promise<void> {
  const varIds = [...new Set(items.map((i) => i.variante_id).filter((x): x is string => !!x))]
  if (varIds.length === 0) return

  const { data: varsRaw } = await supabase
    .from('variantes_producto')
    .select(
      'id, stock_actual, precio_venta, producto:productos!inner ( id, precio_venta, recargo_cc_pct )'
    )
    .eq('tienda_id', tiendaId)
    .in('id', varIds)

  type VarH = {
    id: string
    stock_actual: number
    precio_venta: number | null
    producto: { id: string; precio_venta: number; recargo_cc_pct: number | null }
  }
  const byVar = new Map(((varsRaw ?? []) as unknown as VarH[]).map((v) => [v.id, v]))
  const prodIds = [...new Set([...byVar.values()].map((v) => v.producto.id))]

  const tramosByProd = new Map<string, TramoCantidad[]>()
  if (prodIds.length > 0) {
    const { data: tramosRaw } = await supabase
      .from('producto_tramos_cantidad')
      .select('producto_id, cantidad_desde, descuento_pct, descuento_monto, tipo')
      .eq('tienda_id', tiendaId)
      .in('producto_id', prodIds)
    for (const t of (tramosRaw ?? []) as Array<{
      producto_id: string
      cantidad_desde: number
      descuento_pct: number
    }>) {
      const list = tramosByProd.get(t.producto_id) ?? []
      list.push(mapTramoDb(t))
      tramosByProd.set(t.producto_id, list)
    }
  }

  const packIds = [...new Set(items.map((i) => i.pack_id).filter((x): x is string => !!x))]
  const packsById = new Map<
    string,
    { precio: number; recargo_cc_pct: number | null; tramos: TramoCantidad[] }
  >()
  if (packIds.length > 0) {
    const { data: packsRaw } = await supabase
      .from('producto_packs')
      .select('id, precio, recargo_cc_pct')
      .eq('tienda_id', tiendaId)
      .in('id', packIds)
    const { data: packTramosRaw } = await supabase
      .from('producto_pack_tramos')
      .select('pack_id, cantidad_desde, descuento_pct, descuento_monto, tipo')
      .eq('tienda_id', tiendaId)
      .in('pack_id', packIds)
    const tramosByPack = new Map<string, TramoCantidad[]>()
    for (const t of (packTramosRaw ?? []) as Array<{
      pack_id: string
      cantidad_desde: number
      descuento_pct: number
    }>) {
      const list = tramosByPack.get(t.pack_id) ?? []
      list.push(mapTramoDb(t))
      tramosByPack.set(t.pack_id, list)
    }
    for (const p of (packsRaw ?? []) as Array<{
      id: string
      precio: number
      recargo_cc_pct: number | null
    }>) {
      packsById.set(p.id, {
        precio: Number(p.precio),
        recargo_cc_pct: p.recargo_cc_pct != null ? Number(p.recargo_cc_pct) : null,
        tramos: tramosByPack.get(p.id) ?? [],
      })
    }
  }

  for (const it of items) {
    const v = it.variante_id ? byVar.get(it.variante_id) : undefined
    const pack = it.pack_id ? packsById.get(it.pack_id) : undefined
    it.stock_actual = v ? Number(v.stock_actual) : null
    it.producto_id = v?.producto.id ?? null
    it.precio_lista = pack
      ? pack.precio
      : Number(v?.precio_venta ?? v?.producto.precio_venta ?? it.precio_unitario)
    it.tramos = pack ? pack.tramos : v ? (tramosByProd.get(v.producto.id) ?? []) : []
    it.recargo_cc_pct =
      pack?.recargo_cc_pct != null
        ? pack.recargo_cc_pct
        : v?.producto.recargo_cc_pct != null
          ? Number(v.producto.recargo_cc_pct)
          : null
  }
}

const ESTADOS_ACTIVOS: EstadoPedidoCatalogo[] = [
  'nuevo',
  'visto',
  'confirmado',
  'listo',
  'entregado',
]
const ESTADOS_EN_CURSO: EstadoPedidoCatalogo[] = ['visto', 'confirmado', 'listo', 'entregado']

export async function listarPedidosCatalogo(filtro: FiltroPedidos = 'activos'): Promise<PedidoCatalogo[]> {
  const ctx = await requireTiendaId()
  if (!ctx) return []
  let q = ctx.supabase
    .from('pedidos_catalogo')
    .select(
      'id, tienda_id, numero, estado, cliente_nombre, cliente_telefono, cliente_id, tipo_entrega, direccion_entrega, notas, subtotal, total, venta_id, remito_id, condicion_pago, created_at, updated_at'
    )
    .eq('tienda_id', ctx.tiendaId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (filtro === 'nuevos') q = q.eq('estado', 'nuevo')
  else if (filtro === 'en_curso') q = q.in('estado', ESTADOS_EN_CURSO)
  else if (filtro === 'convertidos') q = q.eq('estado', 'convertido')
  else if (filtro === 'cancelados') q = q.eq('estado', 'cancelado')
  else if (filtro === 'activos') q = q.in('estado', ESTADOS_ACTIVOS)

  const { data, error } = await q
  if (error || !data) return []
  const pedidos = (data as Record<string, unknown>[]).map(mapPedido)
  const ids = pedidos.map((p) => p.id)
  if (ids.length > 0) {
    const { data: countRows } = await ctx.supabase
      .from('pedido_catalogo_items')
      .select('pedido_id')
      .eq('tienda_id', ctx.tiendaId)
      .in('pedido_id', ids)
    const byPedido = new Map<string, number>()
    for (const r of (countRows ?? []) as Array<{ pedido_id: string }>) {
      byPedido.set(r.pedido_id, (byPedido.get(r.pedido_id) ?? 0) + 1)
    }
    for (const p of pedidos) {
      p.items_count = byPedido.get(p.id) ?? 0
    }
  }
  return pedidos
}

export async function obtenerPedidoCatalogo(
  id: string
): Promise<{ pedido: PedidoCatalogo; items: PedidoCatalogoItem[] } | null> {
  const ctx = await requireTiendaId()
  if (!ctx) return null
  const { data, error } = await ctx.supabase
    .from('pedidos_catalogo')
    .select('*')
    .eq('id', id)
    .eq('tienda_id', ctx.tiendaId)
    .maybeSingle()
  if (error || !data) return null
  const { data: itemsRaw } = await ctx.supabase
    .from('pedido_catalogo_items')
    .select('*')
    .eq('pedido_id', id)
    .eq('tienda_id', ctx.tiendaId)
    .order('producto_nombre', { ascending: true })
  const items = ((itemsRaw ?? []) as Record<string, unknown>[]).map(mapItem)
  await hidratarItemsPedido(ctx.supabase, ctx.tiendaId, items)
  return {
    pedido: mapPedido(data as Record<string, unknown>),
    items,
  }
}

export async function contarPedidosNuevos(): Promise<number> {
  const ctx = await requireTiendaId()
  if (!ctx) return 0
  const { count } = await ctx.supabase
    .from('pedidos_catalogo')
    .select('id', { count: 'exact', head: true })
    .eq('tienda_id', ctx.tiendaId)
    .eq('estado', 'nuevo')
  return count ?? 0
}

export async function listarNotificaciones(opts?: {
  unreadOnly?: boolean
  limit?: number
}): Promise<{ items: Notificacion[]; unreadCount: number }> {
  const ctx = await requireTiendaId()
  if (!ctx) return { items: [], unreadCount: 0 }
  const limit = opts?.limit ?? 20

  const unreadQ = ctx.supabase
    .from('notificaciones')
    .select('id', { count: 'exact', head: true })
    .eq('tienda_id', ctx.tiendaId)
    .eq('leida', false)
  const { count } = await unreadQ

  let q = ctx.supabase
    .from('notificaciones')
    .select('id, tienda_id, tipo, titulo, cuerpo, leida, pedido_id, created_at')
    .eq('tienda_id', ctx.tiendaId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (opts?.unreadOnly) q = q.eq('leida', false)

  const { data } = await q
  const items = ((data ?? []) as Notificacion[]).map((n) => ({
    ...n,
    cuerpo: n.cuerpo ?? null,
    pedido_id: n.pedido_id ?? null,
  }))
  return { items, unreadCount: count ?? 0 }
}

export async function obtenerConfigCatalogoTienda() {
  const ctx = await requireTiendaId()
  if (!ctx) return null
  const { data } = await ctx.supabase
    .from('tiendas')
    .select(
      'id, nombre, direccion, ciudad, catalogo_slug, catalogo_activo, whatsapp_pedidos, catalogo_retiro, catalogo_envio, catalogo_mensaje_bienvenida, logo_url'
    )
    .eq('id', ctx.tiendaId)
    .maybeSingle()
  return data
}
