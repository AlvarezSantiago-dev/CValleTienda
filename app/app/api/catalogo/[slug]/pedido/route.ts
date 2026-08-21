import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  MAX_ITEMS_PEDIDO,
  MAX_NOTAS,
  MAX_NOMBRE,
  MAX_QTY_LINEA,
  MIN_DIRECCION,
  RATE_MAX,
  RATE_VENTANA_MS,
} from '@/lib/catalogo/const'
import { obtenerTiendaCatalogoPorSlug, obtenerRubroTiendaId } from '@/lib/catalogo/queries-publico'
import { armarMensajePedido, normalizarWhatsappAR, waMeUrl } from '@/lib/catalogo/whatsapp'
import { rateLimitOk } from '@/lib/catalogo/rate-limit'
import { rubroPermiteStockInfinito } from '@/lib/rubro/config'
import { tieneStockSuficiente } from '@/lib/stock/infinito'
import type { Rubro } from '@/lib/rubro/config'
import { precioConTramo, type TramoCantidad } from '@/lib/precios/tramos-cantidad'

export const runtime = 'nodejs'

function ipDe(req: NextRequest): string {
  const xf = req.headers.get('x-forwarded-for')
  if (xf) return xf.split(',')[0]?.trim() || 'unknown'
  return req.headers.get('x-real-ip') || 'unknown'
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'No se pudo crear el pedido' }, { status: 400 })
  }

  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ ok: true, numero: 0, waUrl: 'https://wa.me/' })
  }

  if (!rateLimitOk(`${ipDe(req)}:${slug}`, RATE_MAX, RATE_VENTANA_MS)) {
    return NextResponse.json({ error: 'Demasiados pedidos. Esperá unos minutos.' }, { status: 429 })
  }

  const tienda = await obtenerTiendaCatalogoPorSlug(slug)
  if (!tienda) {
    return NextResponse.json({ error: 'Este catálogo no está disponible' }, { status: 404 })
  }
  const wa = normalizarWhatsappAR(tienda.whatsapp_pedidos ?? '')
  if (!wa) {
    return NextResponse.json({ error: 'Este catálogo no está disponible' }, { status: 404 })
  }

  const nombre = String(body.cliente_nombre ?? '').trim()
  const telRaw = String(body.cliente_telefono ?? '').trim()
  const telCliente = normalizarWhatsappAR(telRaw) ?? telRaw.replace(/\D/g, '')
  const tipo = body.tipo_entrega === 'envio' ? 'envio' : 'retiro'
  const direccion = String(body.direccion_entrega ?? '').trim()
  const notas = String(body.notas ?? '').trim().slice(0, MAX_NOTAS)
  const itemsIn = Array.isArray(body.items) ? body.items : []

  if (nombre.length < 2 || nombre.length > MAX_NOMBRE) {
    return NextResponse.json({ error: 'Ingresá tu nombre' }, { status: 400 })
  }
  if (telCliente.length < 8) {
    return NextResponse.json({ error: 'Ingresá un teléfono válido' }, { status: 400 })
  }
  if (tipo === 'retiro' && !tienda.catalogo_retiro) {
    return NextResponse.json({ error: 'Este local no acepta retiro' }, { status: 400 })
  }
  if (tipo === 'envio' && !tienda.catalogo_envio) {
    return NextResponse.json({ error: 'Este local no hace envíos' }, { status: 400 })
  }
  if (tipo === 'envio' && direccion.length < MIN_DIRECCION) {
    return NextResponse.json({ error: 'Ingresá la dirección de entrega' }, { status: 400 })
  }
  if (itemsIn.length === 0 || itemsIn.length > MAX_ITEMS_PEDIDO) {
    return NextResponse.json({ error: 'El carrito está vacío o es demasiado grande' }, { status: 400 })
  }

  const parsedItems: Array<{ variante_id: string; cantidad: number }> = []
  for (const it of itemsIn) {
    if (!it || typeof it !== 'object') continue
    const o = it as { variante_id?: unknown; cantidad?: unknown }
    const id = String(o.variante_id ?? '')
    const cant = Number(o.cantidad)
    if (!id || !Number.isFinite(cant) || cant < 1 || cant > MAX_QTY_LINEA) {
      return NextResponse.json({ error: 'Hay un producto inválido en el pedido' }, { status: 400 })
    }
    parsedItems.push({ variante_id: id, cantidad: Math.floor(cant) })
  }

  const admin = createAdminClient()
  const rubro = (await obtenerRubroTiendaId(tienda.id)) as Rubro | null
  const permiteInfinito = rubroPermiteStockInfinito(rubro)

  const ids = parsedItems.map((i) => i.variante_id)
  const { data: varsRaw, error: errVars } = await admin
    .from('variantes_producto')
    .select(
      'id, precio_venta, stock_actual, activo, imagen_url, ' +
        'talla:tallas ( nombre ), color:colores ( nombre ), ' +
        'producto:productos!inner ( id, nombre, precio_venta, activo, visible_en_catalogo, es_kit, es_bundle, imagen_url, tienda_id )'
    )
    .eq('tienda_id', tienda.id)
    .in('id', ids)

  if (errVars || !varsRaw) {
    return NextResponse.json({ error: 'No se pudo crear el pedido' }, { status: 500 })
  }

  type VarRow = {
    id: string
    precio_venta: number | null
    stock_actual: number
    activo: boolean
    imagen_url: string | null
    talla: { nombre: string } | null
    color: { nombre: string } | null
    producto: {
      id: string
      nombre: string
      precio_venta: number
      activo: boolean
      visible_en_catalogo: boolean
      es_kit: boolean
      es_bundle: boolean
      imagen_url: string | null
      tienda_id: string
    }
  }

  const rows = varsRaw as unknown as VarRow[]
  const byId = new Map(rows.map((v) => [v.id, v]))
  const prodIds = [...new Set(rows.map((v) => v.producto.id))]
  const tramosByProd = new Map<string, TramoCantidad[]>()
  if (prodIds.length > 0) {
    const { data: tramosRaw } = await admin
      .from('producto_tramos_cantidad')
      .select('producto_id, cantidad_desde, descuento_pct')
      .eq('tienda_id', tienda.id)
      .in('producto_id', prodIds)
    for (const t of (tramosRaw ?? []) as Array<{
      producto_id: string
      cantidad_desde: number
      descuento_pct: number
    }>) {
      const list = tramosByProd.get(t.producto_id) ?? []
      list.push({ cantidad_desde: Number(t.cantidad_desde), descuento_pct: Number(t.descuento_pct) })
      tramosByProd.set(t.producto_id, list)
    }
  }

  const lineas: Array<{
    variante_id: string
    producto_nombre: string
    talla: string | null
    color: string | null
    cantidad: number
    precio_unitario: number
    total_linea: number
    imagen_url: string | null
  }> = []

  for (const it of parsedItems) {
    const v = byId.get(it.variante_id)
    const prod = v?.producto
    if (!v || !prod || !v.activo || !prod.activo || !prod.visible_en_catalogo || prod.es_kit || prod.es_bundle) {
      return NextResponse.json({ error: 'Un producto ya no está disponible' }, { status: 409 })
    }
    const precioLista = Number(v.precio_venta ?? prod.precio_venta ?? 0)
    if (!(precioLista > 0)) {
      return NextResponse.json({ error: 'Un producto no tiene precio' }, { status: 409 })
    }
    if (!tieneStockSuficiente(Number(v.stock_actual), it.cantidad, permiteInfinito)) {
      return NextResponse.json(
        { error: `Sin stock suficiente de ${prod.nombre}` },
        { status: 409 }
      )
    }
    const precio = precioConTramo(precioLista, tramosByProd.get(prod.id) ?? [], it.cantidad)
    lineas.push({
      variante_id: v.id,
      producto_nombre: prod.nombre,
      talla: v.talla?.nombre ?? null,
      color: v.color?.nombre ?? null,
      cantidad: it.cantidad,
      precio_unitario: precio,
      total_linea: Math.round(precio * it.cantidad * 100) / 100,
      imagen_url: v.imagen_url || prod.imagen_url,
    })
  }

  const subtotal = lineas.reduce((acc, l) => acc + l.total_linea, 0)
  const total = subtotal

  let lastErr: string | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: maxRow } = await admin
      .from('pedidos_catalogo')
      .select('numero')
      .eq('tienda_id', tienda.id)
      .order('numero', { ascending: false })
      .limit(1)
      .maybeSingle()
    const numero = ((maxRow as { numero: number } | null)?.numero ?? 0) + 1

    const { data: pedido, error: errPed } = await admin
      .from('pedidos_catalogo')
      .insert({
        tienda_id: tienda.id,
        numero,
        estado: 'nuevo',
        cliente_nombre: nombre,
        cliente_telefono: telCliente,
        tipo_entrega: tipo,
        direccion_entrega: tipo === 'envio' ? direccion : null,
        notas: notas || null,
        subtotal,
        total,
      })
      .select('id, numero')
      .single()

    if (errPed || !pedido) {
      lastErr = errPed?.message ?? 'insert'
      if (errPed?.message?.includes('unique') || errPed?.code === '23505') continue
      break
    }

    const pedidoId = (pedido as { id: string; numero: number }).id
    const numeroOk = (pedido as { numero: number }).numero

    const { error: errItems } = await admin.from('pedido_catalogo_items').insert(
      lineas.map((l) => ({
        tienda_id: tienda.id,
        pedido_id: pedidoId,
        ...l,
      }))
    )
    if (errItems) {
      await admin.from('pedidos_catalogo').delete().eq('id', pedidoId)
      return NextResponse.json({ error: 'No se pudo crear el pedido' }, { status: 500 })
    }

    const totalFmt = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(total)

    await admin.from('notificaciones').insert({
      tienda_id: tienda.id,
      tipo: 'pedido_catalogo',
      titulo: `Pedido #${numeroOk}`,
      cuerpo: `${nombre} — ${totalFmt} — ${tipo === 'envio' ? 'envío' : 'retiro'}`,
      pedido_id: pedidoId,
      leida: false,
    })

    const mensaje = armarMensajePedido({
      numero: numeroOk,
      nombreTienda: tienda.nombre,
      clienteNombre: nombre,
      clienteTelefono: telCliente,
      tipoEntrega: tipo,
      direccion: direccion,
      notas,
      total,
      items: lineas.map((l) => ({
        nombre: l.producto_nombre,
        talla: l.talla,
        color: l.color,
        cantidad: l.cantidad,
        total: l.total_linea,
      })),
    })

    return NextResponse.json({
      ok: true,
      numero: numeroOk,
      waUrl: waMeUrl(wa, mensaje),
    })
  }

  console.error('[catalogo pedido]', lastErr)
  return NextResponse.json({ error: 'No se pudo crear el pedido' }, { status: 500 })
}
