'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { MAX_PACKS, type ProductoPack, type ProductoPackInput } from '@/lib/packs/types'
import { validarTramos } from '@/lib/precios/tramos-cantidad'

export interface ActionResult<T = unknown> {
  ok: boolean
  error?: string
  data?: T
}

async function requireCtx() {
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

function parsePacks(
  packs: ProductoPackInput[]
): { ok: true; packs: ProductoPackInput[] } | { ok: false; error: string } {
  if (!Array.isArray(packs) || packs.length === 0) {
    return { ok: true, packs: [] }
  }
  if (packs.length > MAX_PACKS) {
    return { ok: false, error: `Máximo ${MAX_PACKS} packs por producto` }
  }
  const seenUnidades = new Set<number>()
  const seenCodigos = new Set<string>()
  const out: ProductoPackInput[] = []
  for (const [i, p] of packs.entries()) {
    const unidades = Math.floor(Number(p.unidades))
    const precio = Number(p.precio)
    if (!Number.isFinite(unidades) || unidades <= 1) {
      return { ok: false, error: `El pack ${i + 1} necesita más de 1 unidad` }
    }
    if (!Number.isFinite(precio) || precio <= 0) {
      return { ok: false, error: `El pack x${unidades} necesita un precio` }
    }
    if (seenUnidades.has(unidades)) {
      return { ok: false, error: `Hay dos packs de ${unidades} unidades` }
    }
    seenUnidades.add(unidades)
    const codigo = p.codigo_barras?.trim() || null
    if (codigo) {
      if (seenCodigos.has(codigo)) {
        return { ok: false, error: `Código duplicado: ${codigo}` }
      }
      seenCodigos.add(codigo)
    }
    const tramosRes = validarTramos(p.tramos ?? [])
    if (!tramosRes.ok) {
      return { ok: false, error: `Pack x${unidades}: ${tramosRes.error}` }
    }
    const recargoRaw = p.recargo_cc_pct
    out.push({
      unidades,
      precio: Math.round(precio * 100) / 100,
      codigo_barras: codigo,
      imagen_url: p.imagen_url?.trim() || null,
      nombre: p.nombre?.trim() || null,
      orden: i,
      recargo_cc_pct:
        recargoRaw == null || recargoRaw === undefined || Number.isNaN(Number(recargoRaw))
          ? null
          : Math.max(0, Number(recargoRaw)),
      tramos: tramosRes.tramos,
    })
  }
  return { ok: true, packs: out }
}

export async function guardarPacksProducto(
  productoId: string,
  packs: ProductoPackInput[]
): Promise<ActionResult<ProductoPack[]>> {
  try {
    if (!productoId) return { ok: false, error: 'Falta el producto' }
    const parsed = parsePacks(packs)
    if (!parsed.ok) return { ok: false, error: parsed.error }

    const { supabase, tiendaId } = await requireCtx()
    const { data: prod } = await supabase
      .from('productos')
      .select('id')
      .eq('id', productoId)
      .eq('tienda_id', tiendaId)
      .maybeSingle()
    if (!prod) return { ok: false, error: 'Producto no encontrado' }

    const { error: errDel } = await supabase
      .from('producto_packs')
      .delete()
      .eq('producto_id', productoId)
      .eq('tienda_id', tiendaId)
    if (errDel) return { ok: false, error: errDel.message }

    const saved: ProductoPack[] = []
    for (const p of parsed.packs) {
      const { data: row, error: errIns } = await supabase
        .from('producto_packs')
        .insert({
          tienda_id: tiendaId,
          producto_id: productoId,
          unidades: p.unidades,
          precio: p.precio,
          codigo_barras: p.codigo_barras,
          imagen_url: p.imagen_url,
          nombre: p.nombre,
          orden: p.orden ?? 0,
          recargo_cc_pct: p.recargo_cc_pct ?? null,
        })
        .select('id, producto_id, unidades, precio, codigo_barras, imagen_url, nombre, orden, recargo_cc_pct')
        .single()
      if (errIns || !row) return { ok: false, error: errIns?.message ?? 'No se pudo guardar el pack' }
      const pack = row as ProductoPack
      pack.tramos = []
      if (p.tramos.length > 0) {
        const { error: errT } = await supabase.from('producto_pack_tramos').insert(
          p.tramos.map((t) => ({
            tienda_id: tiendaId,
            pack_id: pack.id,
            cantidad_desde: t.cantidad_desde,
            descuento_pct: t.descuento_pct,
          }))
        )
        if (errT) return { ok: false, error: errT.message }
        pack.tramos = p.tramos
      }
      saved.push(pack)
    }

    revalidatePath('/productos')
    revalidatePath(`/productos/${productoId}`)
    return { ok: true, data: saved }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
