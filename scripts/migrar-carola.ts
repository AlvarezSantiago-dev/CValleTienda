/**
 * Script de migración: carola_ind.productos.json → Supabase
 *
 * Uso:
 *   npx tsx ../scripts/migrar-carola.ts [--tienda-id=UUID] [--insert]
 *
 * Por defecto corre en modo DRY-RUN (solo muestra qué haría).
 * Pasar --insert para insertar realmente en la base.
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// ─── Config ────────────────────────────────────────────────────────────────

const SUPABASE_URL = 'https://joptfhktuokqpsbblmkt.supabase.co'
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvcHRmaGt0dW9rcXBzYmJsbWt0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM0NDE5NCwiZXhwIjoyMDkzOTIwMTk0fQ.43b4AS1w0sZzMclgwHPLwAw1zOQLLR_noOyyj7239sA'
const JSON_PATH = 'C:\\Users\\Santiago\\Desktop\\caroladb-productos\\carola_ind.productos.json'

// ─── Args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const DRY_RUN = !args.includes('--insert')
const tiendaArg = args.find((a) => a.startsWith('--tienda-id='))
const TIENDA_ID_ARG = tiendaArg ? tiendaArg.split('=')[1] : null

// ─── Tipos del JSON fuente ─────────────────────────────────────────────────

interface VarianteOrigen {
  talle: string
  color: string
  sku: string
  codigoBarras: string
  descuentoPct: number
  stock: number
  stockMinimo: number
}

interface ProductoOrigen {
  nombre: string
  categoria: string
  tipo: string
  precioCompra: number
  precioVenta: number
  variants: VarianteOrigen[]
  stock: number
  stockMinimo: number
  descripcion: string
  numero: number
}

// ─── Cache en memoria ──────────────────────────────────────────────────────

const cacheCategoria = new Map<string, string>()
const cacheTalla = new Map<string, string>()
const cacheColor = new Map<string, string>()

// ─── Helpers ───────────────────────────────────────────────────────────────

async function resolverCategoria(
  sb: ReturnType<typeof createClient>,
  tiendaId: string,
  nombre: string
): Promise<string> {
  const key = nombre.trim().toLowerCase()
  if (cacheCategoria.has(key)) return cacheCategoria.get(key)!

  const { data: existing } = await sb
    .from('categorias')
    .select('id')
    .eq('tienda_id', tiendaId)
    .ilike('nombre', nombre.trim())
    .maybeSingle()

  if (existing) {
    cacheCategoria.set(key, existing.id)
    return existing.id
  }

  const { data: created, error } = await sb
    .from('categorias')
    .insert({ tienda_id: tiendaId, nombre: nombre.trim(), activo: true })
    .select('id')
    .single()
  if (error) throw new Error(`Error creando categoría "${nombre}": ${error.message}`)
  cacheCategoria.set(key, created.id)
  return created.id
}

async function resolverTalla(
  sb: ReturnType<typeof createClient>,
  tiendaId: string,
  nombre: string
): Promise<string> {
  const key = nombre.trim().toLowerCase()
  if (cacheTalla.has(key)) return cacheTalla.get(key)!

  const { data: existing } = await sb
    .from('tallas')
    .select('id')
    .eq('tienda_id', tiendaId)
    .ilike('nombre', nombre.trim())
    .maybeSingle()

  if (existing) {
    cacheTalla.set(key, existing.id)
    return existing.id
  }

  const { data: created, error } = await sb
    .from('tallas')
    .insert({ tienda_id: tiendaId, nombre: nombre.trim(), activo: true })
    .select('id')
    .single()
  if (error) throw new Error(`Error creando talla "${nombre}": ${error.message}`)
  cacheTalla.set(key, created.id)
  return created.id
}

async function resolverColor(
  sb: ReturnType<typeof createClient>,
  tiendaId: string,
  nombre: string
): Promise<string> {
  const key = nombre.trim().toLowerCase()
  if (cacheColor.has(key)) return cacheColor.get(key)!

  const { data: existing } = await sb
    .from('colores')
    .select('id')
    .eq('tienda_id', tiendaId)
    .ilike('nombre', nombre.trim())
    .maybeSingle()

  if (existing) {
    cacheColor.set(key, existing.id)
    return existing.id
  }

  const { data: created, error } = await sb
    .from('colores')
    .insert({ tienda_id: tiendaId, nombre: nombre.trim(), activo: true })
    .select('id')
    .single()
  if (error) throw new Error(`Error creando color "${nombre}": ${error.message}`)
  cacheColor.set(key, created.id)
  return created.id
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════')
  console.log('  Migración: carola_ind.productos.json → Supabase')
  console.log(`  Modo: ${DRY_RUN ? '🔍 DRY-RUN (sin cambios)' : '🚀 INSERT REAL'}`)
  console.log('═══════════════════════════════════════════════\n')

  // 1. Leer JSON
  const raw = fs.readFileSync(JSON_PATH, 'utf-8')
  const productos: ProductoOrigen[] = JSON.parse(raw)
  console.log(`✓ JSON leído: ${productos.length} productos, ${productos.reduce((s, p) => s + p.variants.length, 0)} variantes\n`)

  // 2. Conectar a Supabase (service role bypassa RLS)
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 3. Obtener tiendas disponibles
  const { data: tiendas, error: errorTiendas } = await sb
    .from('tiendas')
    .select('id, nombre, ciudad')
    .order('nombre')
  if (errorTiendas) throw new Error(`No se pudo obtener tiendas: ${errorTiendas.message}`)

  console.log('Tiendas disponibles:')
  tiendas?.forEach((t) => console.log(`  ${t.id}  ${t.nombre}  (${t.ciudad ?? '—'})`))
  console.log()

  // 4. Resolver tienda_id
  let tiendaId: string
  if (TIENDA_ID_ARG) {
    tiendaId = TIENDA_ID_ARG
    const tienda = tiendas?.find((t) => t.id === tiendaId)
    if (!tienda) throw new Error(`No existe tienda con id "${tiendaId}"`)
    console.log(`✓ Tienda seleccionada: ${tienda.nombre}\n`)
  } else if (tiendas?.length === 1) {
    tiendaId = tiendas[0].id
    console.log(`✓ Usando única tienda disponible: ${tiendas[0].nombre}\n`)
  } else {
    console.error('⚠ Hay más de una tienda. Pasá --tienda-id=UUID para elegir.')
    process.exit(1)
  }

  // 5. Contadores
  let productosOk = 0
  let variantesOk = 0
  let stockMovimientosOk = 0
  const errores: string[] = []

  // 6. Migrar cada producto
  for (const prod of productos) {
    try {
      // Resolver categoría
      const categoriaNombre = prod.categoria?.trim() || 'General'
      const categoriaDisplay = categoriaNombre === 'general' ? 'General' : categoriaNombre

      if (DRY_RUN) {
        console.log(`  [DRY] Producto: "${prod.nombre}" | Cat: ${categoriaDisplay} | $${prod.precioVenta} | ${prod.variants.length} variantes`)
        for (const v of prod.variants) {
          const talleLabel = v.talle?.trim() ? v.talle.trim() : '—'
          const colorLabel = v.color?.trim() ? v.color.trim() : '—'
          console.log(`         → Talle: ${talleLabel} | Color: ${colorLabel} | Barras: ${v.codigoBarras} | Stock: ${v.stock}`)
        }
        productosOk++
        variantesOk += prod.variants.length
        stockMovimientosOk += prod.variants.filter((v) => v.stock > 0).length
        continue
      }

      // ── INSERT REAL ──────────────────────────────────────────

      // Resolver categoría (crea si no existe)
      const categoriaId = await resolverCategoria(sb, tiendaId, categoriaDisplay)

      // Insertar producto
      const { data: insertedProd, error: errProd } = await sb
        .from('productos')
        .insert({
          tienda_id: tiendaId,
          categoria_id: categoriaId,
          nombre: prod.nombre.trim(),
          descripcion: prod.descripcion?.trim() || null,
          precio_compra: prod.precioCompra ?? 0,
          precio_venta: prod.precioVenta,
          activo: true,
        })
        .select('id')
        .single()

      if (errProd) {
        errores.push(`Producto "${prod.nombre}": ${errProd.message}`)
        continue
      }

      const productoId = insertedProd.id
      productosOk++

      // Insertar variantes
      for (const v of prod.variants) {
        try {
          const talleNombre = v.talle?.trim()
          const colorNombre = v.color?.trim()

          const tallaId = talleNombre ? await resolverTalla(sb, tiendaId, talleNombre) : null
          const colorId = colorNombre ? await resolverColor(sb, tiendaId, colorNombre) : null

          const { data: insertedVar, error: errVar } = await sb
            .from('variantes_producto')
            .insert({
              tienda_id: tiendaId,
              producto_id: productoId,
              talla_id: tallaId,
              color_id: colorId,
              codigo_barras: v.codigoBarras || null,
              stock_actual: v.stock ?? 0,
              stock_minimo: v.stockMinimo ?? 0,
              activo: true,
            })
            .select('id')
            .single()

          if (errVar) {
            errores.push(`  Variante ${v.talle}/${v.color} de "${prod.nombre}": ${errVar.message}`)
            continue
          }

          variantesOk++

          // Movimiento stock inicial (solo si stock > 0)
          if (v.stock > 0) {
            const { error: errMov } = await sb.from('movimientos_stock').insert({
              tienda_id: tiendaId,
              variante_id: insertedVar.id,
              tipo: 'inicial',
              cantidad: v.stock,
              stock_anterior: 0,
              stock_posterior: v.stock,
              motivo: 'Migración desde sistema anterior',
            })
            if (errMov) {
              errores.push(`  Movimiento stock ${v.codigoBarras}: ${errMov.message}`)
            } else {
              stockMovimientosOk++
            }
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          errores.push(`  Variante ${v.talle}/${v.color} de "${prod.nombre}": ${msg}`)
        }
      }

      process.stdout.write(`✓ ${prod.nombre}\n`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      errores.push(`Producto "${prod.nombre}": ${msg}`)
    }
  }

  // 7. Resumen
  console.log('\n═══════════════════════════════════════════════')
  console.log('  RESUMEN')
  console.log('═══════════════════════════════════════════════')
  console.log(`  Productos   : ${productosOk} / ${productos.length}`)
  console.log(`  Variantes   : ${variantesOk}`)
  console.log(`  Mov. stock  : ${stockMovimientosOk} (con stock inicial > 0)`)
  if (errores.length > 0) {
    console.log(`\n  ⚠ Errores (${errores.length}):`)
    errores.forEach((e) => console.log(`    - ${e}`))
  } else {
    console.log('\n  ✓ Sin errores')
  }
  if (DRY_RUN) {
    console.log('\n  💡 Para insertar realmente, corré con --insert:')
    console.log('     npx tsx ../scripts/migrar-carola.ts --insert\n')
  } else {
    console.log('\n  ✅ Migración completada\n')
  }
}

main().catch((e) => {
  console.error('\n❌ Error fatal:', e instanceof Error ? e.message : e)
  process.exit(1)
})
