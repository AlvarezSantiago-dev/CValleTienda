import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  BUCKET_PRODUCTOS,
  EXTS_COVER,
  MAX_BYTES_UPLOAD,
  TIPOS_IMAGEN_PRODUCTO,
} from '@/lib/productos/imagen-const'
import { detectarImagen } from '@/lib/productos/imagen-magic'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Kind = 'cover' | 'color' | 'variante'

type AuthOk = { supabase: Awaited<ReturnType<typeof createClient>>; tiendaId: string }

async function requireAdminTienda(): Promise<AuthOk | { error: NextResponse }> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) {
    return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) }
  }
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id, rol')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!perfil) {
    return { error: NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 }) }
  }
  if (perfil.rol === 'vendedor') {
    return { error: NextResponse.json({ error: 'Sin permiso' }, { status: 403 }) }
  }
  return { supabase, tiendaId: perfil.tienda_id as string }
}

function parseKind(raw: string | null): Kind {
  if (raw === 'color' || raw === 'variante') return raw
  return 'cover'
}

function keysCover(prefix: string): string[] {
  return EXTS_COVER.map((ext) => `${prefix}/cover.${ext}`)
}

function parseUuid(value: string | null, label: string): string | NextResponse {
  const v = value?.trim() ?? ''
  if (!UUID_RE.test(v)) {
    return NextResponse.json({ error: `${label} inválido` }, { status: 400 })
  }
  return v
}

async function resolverPrefijo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tiendaId: string,
  productoId: string,
  kind: Kind,
  colorId: string | null,
  varianteId: string | null
): Promise<{ prefix: string; error?: NextResponse }> {
  const { data: prod } = await supabase
    .from('productos')
    .select('id')
    .eq('id', productoId)
    .eq('tienda_id', tiendaId)
    .maybeSingle()
  if (!prod) {
    return {
      prefix: '',
      error: NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 }),
    }
  }

  if (kind === 'cover') {
    return { prefix: `${tiendaId}/${productoId}` }
  }

  if (kind === 'color') {
    if (!colorId) {
      return {
        prefix: '',
        error: NextResponse.json({ error: 'Falta el color' }, { status: 400 }),
      }
    }
    const { data: color } = await supabase
      .from('colores')
      .select('id')
      .eq('id', colorId)
      .eq('tienda_id', tiendaId)
      .maybeSingle()
    if (!color) {
      return {
        prefix: '',
        error: NextResponse.json({ error: 'Color no encontrado' }, { status: 404 }),
      }
    }
    return { prefix: `${tiendaId}/${productoId}/color/${colorId}` }
  }

  if (!varianteId) {
    return {
      prefix: '',
      error: NextResponse.json({ error: 'Falta la variante' }, { status: 400 }),
    }
  }
  const { data: variante } = await supabase
    .from('variantes_producto')
    .select('id')
    .eq('id', varianteId)
    .eq('producto_id', productoId)
    .eq('tienda_id', tiendaId)
    .maybeSingle()
  if (!variante) {
    return {
      prefix: '',
      error: NextResponse.json({ error: 'Variante no encontrada' }, { status: 404 }),
    }
  }
  return { prefix: `${tiendaId}/${productoId}/var/${varianteId}` }
}

async function persistirUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tiendaId: string,
  productoId: string,
  kind: Kind,
  colorId: string | null,
  varianteId: string | null,
  url: string | null
) {
  if (kind === 'cover') {
    await supabase
      .from('productos')
      .update({ imagen_url: url })
      .eq('id', productoId)
      .eq('tienda_id', tiendaId)
    return
  }
  if (kind === 'color' && colorId) {
    await supabase
      .from('variantes_producto')
      .update({ imagen_url: url })
      .eq('producto_id', productoId)
      .eq('color_id', colorId)
      .eq('tienda_id', tiendaId)
    return
  }
  if (kind === 'variante' && varianteId) {
    await supabase
      .from('variantes_producto')
      .update({ imagen_url: url })
      .eq('id', varianteId)
      .eq('tienda_id', tiendaId)
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminTienda()
  if ('error' in auth) return auth.error
  const { supabase, tiendaId } = auth

  const formData = await req.formData()
  const file = formData.get('imagen') as File | null
  const productoRaw = parseUuid(formData.get('producto_id') as string | null, 'Producto')
  if (productoRaw instanceof NextResponse) return productoRaw
  const productoId = productoRaw
  const kind = parseKind(formData.get('kind') as string | null)

  let colorId: string | null = null
  let varianteId: string | null = null
  if (kind === 'color') {
    const parsed = parseUuid(formData.get('color_id') as string | null, 'Color')
    if (parsed instanceof NextResponse) return parsed
    colorId = parsed
  }
  if (kind === 'variante') {
    const parsed = parseUuid(formData.get('variante_id') as string | null, 'Variante')
    if (parsed instanceof NextResponse) return parsed
    varianteId = parsed
  }

  if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })
  if (!(TIPOS_IMAGEN_PRODUCTO as readonly string[]).includes(file.type)) {
    return NextResponse.json(
      { error: 'Formato no permitido. Usá JPG, PNG o WEBP.' },
      { status: 400 }
    )
  }
  if (file.size > MAX_BYTES_UPLOAD) {
    return NextResponse.json(
      { error: 'La foto comprimida no puede superar 400 KB. Elegí otra o recortala.' },
      { status: 400 }
    )
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const detected = detectarImagen(bytes, file.type)
  if (!detected) {
    return NextResponse.json({ error: 'El archivo no es una imagen válida' }, { status: 400 })
  }

  const resolved = await resolverPrefijo(
    supabase,
    tiendaId,
    productoId,
    kind,
    colorId,
    varianteId
  )
  if (resolved.error) return resolved.error

  await supabase.storage.from(BUCKET_PRODUCTOS).remove(keysCover(resolved.prefix))

  const path = `${resolved.prefix}/cover.${detected.ext}`
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET_PRODUCTOS)
    .upload(path, bytes, { contentType: detected.contentType, upsert: true })

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 })
  }

  const { data: urlData } = supabase.storage.from(BUCKET_PRODUCTOS).getPublicUrl(path)
  const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`

  await persistirUrl(supabase, tiendaId, productoId, kind, colorId, varianteId, publicUrl)

  return NextResponse.json({ url: publicUrl })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdminTienda()
  if ('error' in auth) return auth.error
  const { supabase, tiendaId } = auth

  const sp = req.nextUrl.searchParams
  const productoRaw = parseUuid(sp.get('producto_id'), 'Producto')
  if (productoRaw instanceof NextResponse) return productoRaw
  const productoId = productoRaw
  const kind = parseKind(sp.get('kind'))

  let colorId: string | null = null
  let varianteId: string | null = null
  if (kind === 'color') {
    const parsed = parseUuid(sp.get('color_id'), 'Color')
    if (parsed instanceof NextResponse) return parsed
    colorId = parsed
  }
  if (kind === 'variante') {
    const parsed = parseUuid(sp.get('variante_id'), 'Variante')
    if (parsed instanceof NextResponse) return parsed
    varianteId = parsed
  }

  const resolved = await resolverPrefijo(
    supabase,
    tiendaId,
    productoId,
    kind,
    colorId,
    varianteId
  )
  if (resolved.error) return resolved.error

  await supabase.storage.from(BUCKET_PRODUCTOS).remove(keysCover(resolved.prefix))
  await persistirUrl(supabase, tiendaId, productoId, kind, colorId, varianteId, null)

  return NextResponse.json({ ok: true })
}
