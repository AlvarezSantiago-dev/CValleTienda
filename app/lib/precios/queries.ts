import { createClient } from '@/lib/supabase/server'
import {
  mapVariante,
  generarPackVariantes,
  computarStockKits,
  type VarianteResultado,
} from '@/lib/pos/queries'
import { rubroPermiteStockInfinito } from '@/lib/rubro/config'

export interface PrecioConsulta {
  id: string
  producto_id: string
  nombre: string
  producto_nombre: string
  precio_venta: number
  stock_actual: number
  stock_efectivo: number
  unidad_de_medida: string
  codigo_barras: string | null
  talla: string | null
  color: string | null
  color_hex: string | null
  imagen_url: string | null
  es_pack: boolean
  pack_cantidad: number | null
  es_kit: boolean
}

const RE_CODIGO = /^[A-Za-z0-9_-]{8,14}$/

const SELECT_PRECIO =
  'id, producto_id, codigo_barras, precio_venta, stock_actual, activo, imagen_url, ' +
  'pack_habilitado, pack_cantidad, pack_precio, pack_codigo_barras, ' +
  'producto:productos!inner(id, nombre, codigo_base, precio_venta, unidad_de_medida, activo, es_kit, imagen_url), ' +
  'talla:tallas(id, nombre), color:colores(id, nombre, hex_color)'

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
  const tiendaId = perfil.tienda_id as string
  const { data: tienda } = await supabase
    .from('tiendas')
    .select('rubro')
    .eq('id', tiendaId)
    .maybeSingle()
  const permiteInfinito = rubroPermiteStockInfinito(
    (tienda as { rubro?: string } | null)?.rubro
  )
  return { supabase, tiendaId, permiteInfinito }
}

function extractImagen(raw: Record<string, unknown>): string | null {
  const producto = (Array.isArray(raw.producto) ? raw.producto[0] : raw.producto) as
    | Record<string, unknown>
    | null
  return (raw.imagen_url as string | null) ?? (producto?.imagen_url as string | null) ?? null
}

export function toPrecioConsulta(v: VarianteResultado, imagenUrl?: string | null): PrecioConsulta {
  const partes: string[] = [v.producto_nombre]
  if (v.talla) partes.push(v.talla)
  if (v.color) partes.push(v.color)
  if (v.es_pack && v.pack_cantidad) partes.push(`Pack x${v.pack_cantidad}`)

  return {
    id: v.id,
    producto_id: v.producto_id,
    nombre: partes.length > 1 ? partes.join(' · ') : v.producto_nombre,
    producto_nombre: v.producto_nombre,
    precio_venta: v.precio_venta,
    stock_actual: v.stock_actual,
    stock_efectivo: v.stock_efectivo,
    unidad_de_medida: v.unidad_de_medida,
    codigo_barras: v.codigo_barras,
    talla: v.talla,
    color: v.color,
    color_hex: v.color_hex,
    imagen_url: imagenUrl ?? null,
    es_pack: v.es_pack,
    pack_cantidad: v.pack_cantidad,
    es_kit: v.es_kit,
  }
}

function sortPrecios(a: PrecioConsulta, b: PrecioConsulta): number {
  const byName = a.producto_nombre.localeCompare(b.producto_nombre, 'es')
  if (byName !== 0) return byName
  const byTalla = (a.talla ?? '').localeCompare(b.talla ?? '', 'es')
  if (byTalla !== 0) return byTalla
  return (a.color ?? '').localeCompare(b.color ?? '', 'es')
}

/**
 * Consulta de precios read-only para /precios.
 * Incluye variantes con stock 0 (a diferencia del POS).
 */
export async function buscarPreciosConsulta(
  query: string,
  limit = 40
): Promise<PrecioConsulta[]> {
  const q = query.trim()
  if (!q) return []

  const { supabase, tiendaId, permiteInfinito } = await getCtx()

  // ── Código exacto ────────────────────────────────────────────────
  if (RE_CODIGO.test(q)) {
    const { data } = await supabase
      .from('variantes_producto')
      .select(SELECT_PRECIO)
      .eq('tienda_id', tiendaId)
      .eq('codigo_barras', q)
      .eq('activo', true)
      .limit(1)

    if (data && (data as unknown[]).length > 0) {
      const raw = (data as unknown as Array<Record<string, unknown>>)[0]
      const v = mapVariante(raw)
      await computarStockKits(supabase, tiendaId, [v], permiteInfinito)
      return [toPrecioConsulta(v, extractImagen(raw))]
    }

    const { data: packData } = await supabase
      .from('variantes_producto')
      .select(SELECT_PRECIO)
      .eq('tienda_id', tiendaId)
      .eq('pack_codigo_barras', q)
      .eq('activo', true)
      .eq('pack_habilitado', true)
      .limit(1)

    if (packData && (packData as unknown[]).length > 0) {
      const raw = (packData as unknown as Array<Record<string, unknown>>)[0]
      const v = mapVariante(raw)
      await computarStockKits(supabase, tiendaId, [v], permiteInfinito)
      const packs = generarPackVariantes([v], permiteInfinito).filter((p) => p.es_pack)
      return packs.map((p) => toPrecioConsulta(p, extractImagen(raw)))
    }

    return []
  }

  // ── Búsqueda por texto ───────────────────────────────────────────
  const term = q.replace(/[,()]/g, ' ').replace(/\s+/g, ' ').trim()
  const pattern = `%${term}%`

  const { data: prodIdsRaw } = await supabase
    .from('productos')
    .select('id')
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .or(`nombre.ilike.${pattern},codigo_base.ilike.${pattern}`)
    .limit(50)

  const prodIds = ((prodIdsRaw ?? []) as Array<{ id: string }>).map((p) => p.id)

  const { data: porBarcode } = await supabase
    .from('variantes_producto')
    .select(SELECT_PRECIO)
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .ilike('codigo_barras', pattern)
    .limit(limit)

  let porProducto: Array<Record<string, unknown>> = []
  if (prodIds.length > 0) {
    const { data } = await supabase
      .from('variantes_producto')
      .select(SELECT_PRECIO)
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .in('producto_id', prodIds)
      .limit(limit)
    porProducto = (data ?? []) as unknown as Array<Record<string, unknown>>
  }

  const imagenByVarianteId = new Map<string, string | null>()
  const merged = new Map<string, VarianteResultado>()

  for (const r of (porBarcode ?? []) as unknown as Array<Record<string, unknown>>) {
    const v = mapVariante(r)
    merged.set(v.id, v)
    imagenByVarianteId.set(v.id, extractImagen(r))
  }
  for (const r of porProducto) {
    const v = mapVariante(r)
    if (!merged.has(v.id)) {
      merged.set(v.id, v)
      imagenByVarianteId.set(v.id, extractImagen(r))
    }
  }

  const todasVariantes = Array.from(merged.values())
  await computarStockKits(supabase, tiendaId, todasVariantes, permiteInfinito)

  const packs = generarPackVariantes(
    todasVariantes.filter((v) => !v.es_kit),
    permiteInfinito
  )
  const combined = [...todasVariantes, ...packs]

  return combined
    .slice(0, limit * 2)
    .map((v) => {
      const baseId = v.es_pack ? v.id.replace('__pack', '') : v.id
      return toPrecioConsulta(v, imagenByVarianteId.get(baseId) ?? null)
    })
    .sort(sortPrecios)
    .slice(0, limit)
}
