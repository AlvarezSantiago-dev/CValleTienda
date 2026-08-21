import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function requireTienda() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) }
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!perfil) return { error: NextResponse.json({ error: 'Sin perfil' }, { status: 403 }) }
  return { supabase, tiendaId: perfil.tienda_id as string }
}

export async function GET(req: NextRequest) {
  const ctx = await requireTienda()
  if ('error' in ctx) return ctx.error
  const unreadOnly = req.nextUrl.searchParams.get('unread') === '1'

  const { count } = await ctx.supabase
    .from('notificaciones')
    .select('id', { count: 'exact', head: true })
    .eq('tienda_id', ctx.tiendaId)
    .eq('leida', false)

  let q = ctx.supabase
    .from('notificaciones')
    .select('id, tipo, titulo, cuerpo, leida, pedido_id, created_at')
    .eq('tienda_id', ctx.tiendaId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (unreadOnly) q = q.eq('leida', false)

  const { data } = await q
  return NextResponse.json({ items: data ?? [], unreadCount: count ?? 0 })
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireTienda()
  if ('error' in ctx) return ctx.error
  let body: { ids?: string[]; all?: boolean }
  try {
    body = (await req.json()) as { ids?: string[]; all?: boolean }
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  let q = ctx.supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('tienda_id', ctx.tiendaId)
    .eq('leida', false)
  if (!body.all) {
    const ids = (body.ids ?? []).filter(Boolean)
    if (ids.length === 0) return NextResponse.json({ ok: true })
    q = q.in('id', ids)
  }
  const { error } = await q
  if (error) return NextResponse.json({ error: 'No se pudieron marcar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
