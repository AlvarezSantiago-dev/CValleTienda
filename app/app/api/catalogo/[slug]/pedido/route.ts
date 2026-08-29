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
import { obtenerTiendaCatalogoPorSlug } from '@/lib/catalogo/queries-publico'
import { armarMensajePedido, normalizarWhatsappAR, waMeUrl } from '@/lib/catalogo/whatsapp'
import { rateLimitOk } from '@/lib/catalogo/rate-limit'
import { getConfigRubro, rubroPermiteStockInfinito } from '@/lib/rubro/config'
import { tieneStockSuficiente } from '@/lib/stock/infinito'
import { precioConTramo, qtyParaTramo, type TramoCantidad } from '@/lib/precios/tramos-cantidad'
import { labelPack } from '@/lib/packs/virtual'
import { precioConRecargoCc, recargoCascada } from '@/lib/pos/precio-cc'
import type { CondicionPago } from '@/types/database'

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

  const parsedItems: Array<{ variante_id: string; cantidad: number; pack_id: string | null }> = []
  for (const it of itemsIn) {
    if (!it || typeof it !== 'object') continue
    const o = it as { variante_id?: unknown; cantidad?: unknown; pack_id?: unknown }
    const id = String(o.variante_id ?? '')
    const cant = Number(o.cantidad)
    const packId =
      typeof o.pack_id === 'string' && o.pack_id.trim() ? o.pack_id.trim() : null
    if (!id || !Number.isFinite(cant) || cant < 1 || cant > MAX_QTY_LINEA) {
      return NextResponse.json({ error: 'Hay un producto inválido en el pedido' }, { status: 400 })
    }
    parsedItems.push({ variante_id: id, cantidad: Math.floor(cant), pack_id: packId })
  }

  const admin = createAdminClient()
  const rubro = tienda.rubro
  const permiteInfinito = rubroPermiteStockInfinito(rubro)
  const usarPedidoCc = getConfigRubro(rubro).usarPedidoCc
  const condicion: CondicionPago =
    usarPedidoCc && body.condicion_pago === 'cuenta_corriente' ? 'cuenta_corriente' : 'contado'
  let recargoDefault = 0
  if (usarPedidoCc) {
    const { data: cfg } = await admin
      .from('configuracion_tienda')
      .select('recargo_cc_default')
      .eq('tienda_id', tienda.id)
      .maybeSingle()
    recargoDefault = Number(
      (cfg as { recargo_cc_default?: number } | null)?.recargo_cc_default ?? 0
    )
  }

  const ids = parsedItems.map((i) => i.variante_id)
  const { data: varsRaw, error: errVars } = await admin
    .from('variantes_producto')
    .select(
      'id, precio_venta, stock_actual, activo, imagen_url, ' +
        'talla:tallas ( nombre ), color:colores ( nombre ), ' +
        'producto:productos!inner ( id, nombre, precio_venta, recargo_cc_pct, activo, visible_en_catalogo, es_kit, es_bundle, imagen_url, tienda_id )'
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
      recargo_cc_pct: number | null
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

  const packIds = [...new Set(parsedItems.map((i) => i.pack_id).filter((x): x is string => !!x))]
  const packsById = new Map<
    string,
    {
      id: string
      producto_id: string
      unidades: number
      precio: number
      nombre: string | null
      imagen_url: string | null
      recargo_cc_pct: number | null
      tramos: TramoCantidad[]
    }
  >()
  if (packIds.length > 0) {
    const { data: packsRaw } = await admin
      .from('producto_packs')
      .select('id, producto_id, unidades, precio, nombre, imagen_url, recargo_cc_pct')
      .eq('tienda_id', tienda.id)
      .in('id', packIds)
    const { data: packTramosRaw } = await admin
      .from('producto_pack_tramos')
      .select('pack_id, cantidad_desde, descuento_pct')
      .eq('tienda_id', tienda.id)
      .in('pack_id', packIds)
    const tramosByPack = new Map<string, TramoCantidad[]>()
    for (const t of (packTramosRaw ?? []) as Array<{
      pack_id: string
      cantidad_desde: number
      descuento_pct: number
    }>) {
      const list = tramosByPack.get(t.pack_id) ?? []
      list.push({ cantidad_desde: Number(t.cantidad_desde), descuento_pct: Number(t.descuento_pct) })
      tramosByPack.set(t.pack_id, list)
    }
    for (const p of (packsRaw ?? []) as Array<{
      id: string
      producto_id: string
      unidades: number
      precio: number
      nombre: string | null
      imagen_url: string | null
      recargo_cc_pct: number | null
    }>) {
      packsById.set(p.id, {
        ...p,
        unidades: Number(p.unidades),
        precio: Number(p.precio),
        recargo_cc_pct: p.recargo_cc_pct != null ? Number(p.recargo_cc_pct) : null,
        tramos: tramosByPack.get(p.id) ?? [],
      })
    }
  }

  const drafts: Array<{
    variante_id: string
    producto_nombre: string
    talla: string | null
    color: string | null
    cantidad: number
    imagen_url: string | null
    pack_id: string | null
    pack_unidades: number | null
    precioLista: number
    tramos: TramoCantidad[]
    recargoPack: number | null
    recargoProd: number | null
    prodId: string
  }> = []

  const consumoFisico = new Map<string, number>()
  for (const it of parsedItems) {
    const v = byId.get(it.variante_id)
    const prod = v?.producto
    if (!v || !prod || !v.activo || !prod.activo || !prod.visible_en_catalogo || prod.es_kit || prod.es_bundle) {
      return NextResponse.json({ error: 'Un producto ya no está disponible' }, { status: 409 })
    }
    const pack = it.pack_id ? packsById.get(it.pack_id) : null
    if (it.pack_id && (!pack || pack.producto_id !== prod.id)) {
      return NextResponse.json({ error: 'Un pack ya no está disponible' }, { status: 409 })
    }
    const packUnidades = pack ? pack.unidades : 1
    const precioLista = pack ? pack.precio : Number(v.precio_venta ?? prod.precio_venta ?? 0)
    if (!(precioLista > 0)) {
      return NextResponse.json({ error: 'Un producto no tiene precio' }, { status: 409 })
    }
    const fisico = it.cantidad * packUnidades
    consumoFisico.set(v.id, (consumoFisico.get(v.id) ?? 0) + fisico)
    if (!tieneStockSuficiente(Number(v.stock_actual), consumoFisico.get(v.id) ?? 0, permiteInfinito)) {
      return NextResponse.json(
        { error: `Sin stock suficiente de ${prod.nombre}` },
        { status: 409 }
      )
    }
    const packLabel = pack ? labelPack(pack.unidades, pack.nombre) : null
    drafts.push({
      variante_id: v.id,
      producto_nombre: packLabel ? `${prod.nombre} · ${packLabel}` : prod.nombre,
      talla: v.talla?.nombre ?? null,
      color: v.color?.nombre ?? null,
      cantidad: it.cantidad,
      imagen_url: pack?.imagen_url || v.imagen_url || prod.imagen_url,
      pack_id: pack?.id ?? null,
      pack_unidades: pack ? pack.unidades : null,
      precioLista,
      tramos: pack ? pack.tramos : (tramosByProd.get(prod.id) ?? []),
      recargoPack: pack?.recargo_cc_pct ?? null,
      recargoProd: prod.recargo_cc_pct != null ? Number(prod.recargo_cc_pct) : null,
      prodId: prod.id,
    })
  }

  const grupos = drafts.map((d) => ({
    productoId: d.prodId,
    packId: d.pack_id,
    cantidad: d.cantidad,
    esPack: Boolean(d.pack_id),
  }))

  const lineas = drafts.map((d) => {
    const qty = qtyParaTramo(grupos, {
      productoId: d.prodId,
      packId: d.pack_id,
      cantidad: d.cantidad,
      esPack: Boolean(d.pack_id),
    })
    const contado = precioConTramo(d.precioLista, d.tramos, qty)
    const recargo = recargoCascada(d.recargoPack, d.recargoProd, recargoDefault)
    const precio =
      condicion === 'cuenta_corriente' ? precioConRecargoCc(contado, recargo) : contado
    return {
      variante_id: d.variante_id,
      producto_nombre: d.producto_nombre,
      talla: d.talla,
      color: d.color,
      cantidad: d.cantidad,
      precio_unitario: precio,
      total_linea: Math.round(precio * d.cantidad * 100) / 100,
      imagen_url: d.imagen_url,
      pack_id: d.pack_id,
      pack_unidades: d.pack_unidades,
    }
  })

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
        condicion_pago: condicion,
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
      cuerpo: `${nombre} — ${totalFmt} — ${tipo === 'envio' ? 'envío' : 'retiro'}${condicion === 'cuenta_corriente' ? ' — a cuenta' : ''}`,
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
      condicionPago: usarPedidoCc ? condicion : undefined,
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
