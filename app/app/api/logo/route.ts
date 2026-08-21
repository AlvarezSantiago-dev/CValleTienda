import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'logos'
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB (el cliente comprime a ≪512 KB para PrintBridge)
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!perfil) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })
  const tiendaId = perfil.tienda_id as string

  const formData = await req.formData()
  const file = formData.get('logo') as File | null
  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Formato no permitido. Usá PNG, JPG, WEBP o SVG.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo no puede superar 2 MB.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
  const path = `${tiendaId}/logo.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path)
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}` // cache bust

  // Guardar en tiendas.logo_url
  await supabase.from('tiendas').update({ logo_url: publicUrl }).eq('id', tiendaId)

  return NextResponse.json({ url: publicUrl })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!perfil) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })
  const tiendaId = perfil.tienda_id as string

  // Buscar y eliminar cualquier variante de logo
  for (const ext of ['png', 'jpg', 'jpeg', 'webp', 'svg']) {
    await supabase.storage.from(BUCKET).remove([`${tiendaId}/logo.${ext}`])
  }
  await supabase.from('tiendas').update({ logo_url: null }).eq('id', tiendaId)

  return NextResponse.json({ ok: true })
}
