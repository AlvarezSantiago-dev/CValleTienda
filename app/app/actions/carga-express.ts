'use server'

import { revalidatePath } from 'next/cache'
import {
  crearProducto,
  crearCategoriaInline,
  crearTallaInline,
  crearColorInline,
  generarCodigosBarrasBatch,
  type ActionResult,
  type ProductoInput,
} from '@/app/actions/productos'
import { createClient } from '@/lib/supabase/server'
import { getContextoTienda } from '@/lib/supabase/context'
import { expandirVariantes, filtrarCeldasDraft } from '@/lib/productos/carga-express/expandir-variantes'
import { validarDraft, type CargaExpressDraft } from '@/lib/productos/carga-express/tipos'
import { titleCase, upperCaseTrim } from '@/lib/utils/text'

function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

/**
 * Resuelve taxonomías por nombre (crea si faltan), genera EAN opcionales
 * y crea el producto vía `crearProducto`.
 */
export async function resolverYCrearProductoExpress(
  draft: CargaExpressDraft
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getContextoTienda()
    if (!ctx) return { ok: false, error: 'No autenticado' }
    if (ctx.rubro !== 'ropa') {
      return { ok: false, error: 'Carga express está disponible solo para tiendas de ropa' }
    }

    const err = validarDraft(draft)
    if (err) return { ok: false, error: err }

    const supabase = await createClient()
    const tiendaId = ctx.tiendaId

    // --- Categoría ---
    let categoriaId: string | null = null
    if (draft.categoriaNombre?.trim()) {
      const nombreCat = titleCase(draft.categoriaNombre)
      const { data: cats } = await supabase
        .from('categorias')
        .select('id, nombre')
        .eq('tienda_id', tiendaId)
        .eq('activo', true)
      const hit = (cats ?? []).find((c) => norm(c.nombre) === norm(nombreCat))
      if (hit) {
        categoriaId = hit.id
      } else {
        const created = await crearCategoriaInline(nombreCat)
        if (!created.ok || !created.data) {
          return { ok: false, error: created.error ?? 'No se pudo crear la categoría' }
        }
        categoriaId = created.data.id
      }
    }

    // --- Colores ---
    const { data: coloresDb } = await supabase
      .from('colores')
      .select('id, nombre, hex_color')
      .eq('tienda_id', tiendaId)
      .eq('activo', true)

    const colorIdByNorm = new Map<string, string>()
    for (const c of coloresDb ?? []) {
      colorIdByNorm.set(norm(c.nombre), c.id)
    }

    const coloresNecesarios = new Map<string, string | null | undefined>()
    for (const c of draft.colores) {
      coloresNecesarios.set(norm(c.nombre), c.hex)
    }
    for (const cel of draft.celdas) {
      if (!coloresNecesarios.has(norm(cel.colorNombre))) {
        coloresNecesarios.set(norm(cel.colorNombre), null)
      }
    }

    for (const [n, hex] of coloresNecesarios) {
      if (colorIdByNorm.has(n)) continue
      const display = titleCase(n)
      const created = await crearColorInline(display, hex ?? undefined)
      if (!created.ok || !created.data) {
        return { ok: false, error: created.error ?? `No se pudo crear el color ${display}` }
      }
      colorIdByNorm.set(norm(created.data.nombre), created.data.id)
    }

    // --- Tallas ---
    const { data: tallasDb } = await supabase
      .from('tallas')
      .select('id, nombre')
      .eq('tienda_id', tiendaId)
      .eq('activo', true)

    const tallaIdByKey = new Map<string, string>()
    for (const t of tallasDb ?? []) {
      tallaIdByKey.set(t.nombre.toUpperCase(), t.id)
    }

    const tallasNecesarias = new Set<string>()
    for (const t of draft.tallas) tallasNecesarias.add(upperCaseTrim(t))
    for (const cel of draft.celdas) tallasNecesarias.add(upperCaseTrim(cel.tallaNombre))

    for (const tNombre of tallasNecesarias) {
      if (!tNombre) continue
      if (tallaIdByKey.has(tNombre)) continue
      const created = await crearTallaInline(tNombre)
      if (!created.ok || !created.data) {
        return { ok: false, error: created.error ?? `No se pudo crear el talle ${tNombre}` }
      }
      tallaIdByKey.set(created.data.nombre.toUpperCase(), created.data.id)
    }

    // --- Celdas → variantes ---
    const celdas = filtrarCeldasDraft(draft.celdas, draft.crearCeldasEnCero ?? false)
    const celdasIds: { colorId: string; tallaId: string; cantidad: number }[] = []

    for (const cel of celdas) {
      const colorId = colorIdByNorm.get(norm(cel.colorNombre))
      const tallaId = tallaIdByKey.get(upperCaseTrim(cel.tallaNombre))
      if (!colorId || !tallaId) {
        return {
          ok: false,
          error: `No se pudo resolver ${cel.colorNombre} / ${cel.tallaNombre}`,
        }
      }
      celdasIds.push({ colorId, tallaId, cantidad: cel.cantidad })
    }

    if (celdasIds.length === 0) {
      return { ok: false, error: 'No hay variantes para crear' }
    }
    if (celdasIds.length > 50) {
      return { ok: false, error: 'Máximo 50 variantes por carga express' }
    }

    let codigos: (string | null)[] | undefined
    if (draft.generarBarras) {
      const batch = await generarCodigosBarrasBatch(celdasIds.length)
      if (!batch.ok || !batch.data) {
        return { ok: false, error: batch.error ?? 'No se pudieron generar códigos de barras' }
      }
      codigos = batch.data.codigos
    }

    const variantes = expandirVariantes(celdasIds, {
      crearCeldasEnCero: draft.crearCeldasEnCero,
      codigosBarras: codigos,
    })

    const input: ProductoInput = {
      nombre: draft.nombre.trim(),
      descripcion: draft.descripcion?.trim() || null,
      codigo_base: draft.codigoBase?.trim() || null,
      categoria_id: categoriaId,
      precio_compra: draft.precioCompra || 0,
      precio_venta: draft.precioVenta,
      unidad_de_medida: 'unidad',
      imagen_url: null,
      variantes,
    }

    const result = await crearProducto(input)
    if (!result.ok) return result

    revalidatePath('/productos')
    revalidatePath('/productos/carga-express')
    revalidatePath('/stock')
    revalidatePath('/productos/colores')
    revalidatePath('/productos/tallas')
    revalidatePath('/productos/categorias')

    return result
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
