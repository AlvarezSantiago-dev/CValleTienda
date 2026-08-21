'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugifyNombre, validarSlug, siguienteSlugDisponible } from '@/lib/catalogo/slug'
import { normalizarWhatsappAR } from '@/lib/catalogo/whatsapp'
import { puedeUsar } from '@/lib/planes/config'
import { getContextoTienda } from '@/lib/supabase/context'
import { registrarVenta, type PagoVentaInput } from '@/app/actions/ventas'
import { crearRemitoDesdeVenta } from '@/app/actions/remitos'
import { crearCliente } from '@/app/actions/clientes'
import type { CondicionPago, EstadoPedidoCatalogo, TipoEntregaCatalogo } from '@/types/database'
import { getConfigRubro } from '@/lib/rubro/config'
import { precioConTramo, type TramoCantidad } from '@/lib/precios/tramos-cantidad'
import { precioConRecargoCc, recargoEfectivo } from '@/lib/pos/precio-cc'
import { MIN_DIRECCION } from '@/lib/catalogo/const'

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
    .select('tienda_id, rol')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!perfil) throw new Error('Perfil no encontrado')
  return {
    supabase,
    tiendaId: perfil.tienda_id as string,
    userId: auth.user.id,
    rol: perfil.rol as string,
  }
}

function traducirError(msg?: string | null): string {
  if (!msg) return 'Error desconocido'
  if (msg.includes('duplicate key') || msg.includes('unique')) return 'Ese link ya está en uso'
  if (msg.includes('row-level security')) return 'No tenés permisos para esta operación'
  return msg
}

export interface ConfigCatalogoInput {
  nombre_publico: string
  direccion_retiro: string
  catalogo_slug: string
  catalogo_activo: boolean
  whatsapp_pedidos: string
  catalogo_retiro: boolean
  catalogo_envio: boolean
  catalogo_mensaje_bienvenida: string
}

export async function guardarConfigCatalogo(
  input: ConfigCatalogoInput
): Promise<ActionResult> {
  try {
    const { supabase, tiendaId, rol } = await requireCtx()
    if (!['owner', 'admin'].includes(rol)) {
      return { ok: false, error: 'Solo el dueño o administrador puede configurar el catálogo' }
    }

    const nombre = input.nombre_publico.trim()
    if (nombre.length < 2) return { ok: false, error: 'El nombre público es obligatorio' }

    let slug = input.catalogo_slug.trim().toLowerCase()
    if (!slug) slug = slugifyNombre(nombre)
    const slugErr = validarSlug(slug)
    if (slugErr) return { ok: false, error: slugErr }

    const wa = normalizarWhatsappAR(input.whatsapp_pedidos)
    const activo = Boolean(input.catalogo_activo)
    if (activo && !wa) {
      return { ok: false, error: 'Para activar el catálogo cargá un WhatsApp válido' }
    }
    if (!input.catalogo_retiro && !input.catalogo_envio) {
      return { ok: false, error: 'Elegí al menos retiro o envío' }
    }

    const { data: taken } = await supabase
      .from('tiendas')
      .select('id')
      .eq('catalogo_slug', slug)
      .neq('id', tiendaId)
      .maybeSingle()
    if (taken) {
      const admin = createAdminClient()
      const { data: all } = await admin.from('tiendas').select('catalogo_slug').not('catalogo_slug', 'is', null)
      const ocupados = new Set(
        ((all ?? []) as { catalogo_slug: string | null }[])
          .map((r) => r.catalogo_slug)
          .filter((s): s is string => Boolean(s))
      )
      const sugerido = siguienteSlugDisponible(slug, ocupados)
      return { ok: false, error: `Ese link ya está en uso. Probá con ${sugerido}` }
    }

    const { error } = await supabase
      .from('tiendas')
      .update({
        nombre,
        direccion: input.direccion_retiro.trim() || null,
        catalogo_slug: slug,
        catalogo_activo: activo,
        whatsapp_pedidos: wa,
        catalogo_retiro: input.catalogo_retiro,
        catalogo_envio: input.catalogo_envio,
        catalogo_mensaje_bienvenida: input.catalogo_mensaje_bienvenida.trim() || null,
      })
      .eq('id', tiendaId)

    if (error) return { ok: false, error: traducirError(error.message) }
    revalidatePath('/configuracion/catalogo')
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

const TRANSICIONES: Record<EstadoPedidoCatalogo, EstadoPedidoCatalogo[]> = {
  nuevo: ['visto', 'confirmado', 'cancelado'],
  visto: ['confirmado', 'cancelado'],
  confirmado: ['listo', 'cancelado'],
  listo: ['entregado', 'cancelado'],
  entregado: ['cancelado'],
  cancelado: [],
  convertido: [],
}

export async function cambiarEstadoPedido(
  pedidoId: string,
  estado: EstadoPedidoCatalogo
): Promise<ActionResult> {
  try {
    if (estado === 'convertido') {
      return { ok: false, error: 'Para convertir el pedido usá confirmar envío / retiro' }
    }
    const { supabase, tiendaId } = await requireCtx()
    const { data: row } = await supabase
      .from('pedidos_catalogo')
      .select('id, estado')
      .eq('id', pedidoId)
      .eq('tienda_id', tiendaId)
      .maybeSingle()
    if (!row) return { ok: false, error: 'Pedido no encontrado' }
    const actual = (row as { estado: EstadoPedidoCatalogo }).estado
    const permitidos = TRANSICIONES[actual] ?? []
    if (!permitidos.includes(estado)) {
      return { ok: false, error: 'Ese cambio de estado no está permitido' }
    }
    const { error } = await supabase
      .from('pedidos_catalogo')
      .update({ estado })
      .eq('id', pedidoId)
      .eq('tienda_id', tiendaId)
    if (error) return { ok: false, error: traducirError(error.message) }
    revalidatePath('/pedidos')
    revalidatePath(`/pedidos/${pedidoId}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export async function marcarPedidoVisto(pedidoId: string): Promise<ActionResult> {
  try {
    const { supabase, tiendaId } = await requireCtx()
    const { data: row } = await supabase
      .from('pedidos_catalogo')
      .select('estado')
      .eq('id', pedidoId)
      .eq('tienda_id', tiendaId)
      .maybeSingle()
    if (!row) return { ok: false, error: 'Pedido no encontrado' }
    if ((row as { estado: string }).estado === 'nuevo') {
      await supabase
        .from('pedidos_catalogo')
        .update({ estado: 'visto' })
        .eq('id', pedidoId)
        .eq('tienda_id', tiendaId)
    }
    await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('tienda_id', tiendaId)
      .eq('pedido_id', pedidoId)
      .eq('leida', false)
    revalidatePath('/pedidos')
    revalidatePath(`/pedidos/${pedidoId}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export async function marcarNotificacionesLeidas(input: {
  ids?: string[]
  all?: boolean
}): Promise<ActionResult> {
  try {
    const { supabase, tiendaId } = await requireCtx()
    let q = supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('tienda_id', tiendaId)
      .eq('leida', false)
    if (!input.all) {
      const ids = (input.ids ?? []).filter(Boolean)
      if (ids.length === 0) return { ok: true }
      q = q.in('id', ids)
    }
    const { error } = await q
    if (error) return { ok: false, error: traducirError(error.message) }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export async function setVisibleEnCatalogo(
  productoId: string,
  visible: boolean
): Promise<ActionResult> {
  try {
    const { supabase, tiendaId, rol } = await requireCtx()
    if (!['owner', 'admin'].includes(rol)) {
      return { ok: false, error: 'Solo el dueño o administrador puede publicar en el catálogo' }
    }
    const { data: prod } = await supabase
      .from('productos')
      .select('es_kit, es_bundle')
      .eq('id', productoId)
      .eq('tienda_id', tiendaId)
      .maybeSingle()
    if (!prod) return { ok: false, error: 'Producto no encontrado' }
    if (visible && ((prod as { es_kit: boolean }).es_kit || (prod as { es_bundle: boolean }).es_bundle)) {
      return { ok: false, error: 'Los kits y bundles no se pueden mostrar en el catálogo' }
    }
    const { error } = await supabase
      .from('productos')
      .update({ visible_en_catalogo: visible })
      .eq('id', productoId)
      .eq('tienda_id', tiendaId)
    if (error) return { ok: false, error: traducirError(error.message) }
    revalidatePath('/productos')
    revalidatePath(`/productos/${productoId}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

const ESTADOS_EDITABLES: EstadoPedidoCatalogo[] = ['nuevo', 'visto', 'confirmado', 'listo']

type LineaPedidoSnap = {
  variante_id: string
  producto_nombre: string
  talla: string | null
  color: string | null
  cantidad: number
  precio_unitario: number
  total_linea: number
  imagen_url: string | null
}

async function recostearLineasPedido(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tiendaId: string,
  items: Array<{
    variante_id: string
    cantidad: number
    precio_unitario?: number
    producto_nombre?: string
    talla?: string | null
    color?: string | null
    imagen_url?: string | null
  }>,
  opts: { condicion: CondicionPago; recargoDefault: number }
): Promise<{ ok: true; lineas: LineaPedidoSnap[] } | { ok: false; error: string }> {
  if (items.length === 0) return { ok: false, error: 'El pedido no tiene productos' }
  const ids = [...new Set(items.map((i) => i.variante_id).filter(Boolean))]
  const { data: varsRaw } = await supabase
    .from('variantes_producto')
    .select(
      'id, precio_venta, activo, imagen_url, ' +
        'talla:tallas ( nombre ), color:colores ( nombre ), ' +
        'producto:productos!inner ( id, nombre, precio_venta, recargo_cc_pct, activo, imagen_url )'
    )
    .eq('tienda_id', tiendaId)
    .in('id', ids)

  type VarRow = {
    id: string
    precio_venta: number | null
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
      imagen_url: string | null
    }
  }
  const byId = new Map(((varsRaw ?? []) as unknown as VarRow[]).map((v) => [v.id, v]))
  const prodIds = [...new Set([...byId.values()].map((v) => v.producto.id))]
  const tramosByProd = new Map<string, TramoCantidad[]>()
  if (prodIds.length > 0) {
    const { data: tramosRaw } = await supabase
      .from('producto_tramos_cantidad')
      .select('producto_id, cantidad_desde, descuento_pct')
      .eq('tienda_id', tiendaId)
      .in('producto_id', prodIds)
    for (const t of (tramosRaw ?? []) as Array<{
      producto_id: string
      cantidad_desde: number
      descuento_pct: number
    }>) {
      const list = tramosByProd.get(t.producto_id) ?? []
      list.push({
        cantidad_desde: Number(t.cantidad_desde),
        descuento_pct: Number(t.descuento_pct),
      })
      tramosByProd.set(t.producto_id, list)
    }
  }

  const lineas: LineaPedidoSnap[] = []
  for (const it of items) {
    const cant = Number(it.cantidad)
    if (!Number.isFinite(cant) || cant <= 0) {
      return { ok: false, error: 'Hay una cantidad inválida' }
    }
    const v = byId.get(it.variante_id)
    const prod = v?.producto
    let lista = Number(it.precio_unitario ?? 0)
    let nombre = it.producto_nombre ?? 'Producto'
    let talla = it.talla ?? null
    let color = it.color ?? null
    let imagen = it.imagen_url ?? null
    let recargoProd: number | null = null
    let tramos: TramoCantidad[] = []
    if (v && prod && v.activo && prod.activo) {
      lista = Number(v.precio_venta ?? prod.precio_venta ?? lista)
      nombre = prod.nombre
      talla = v.talla?.nombre ?? talla
      color = v.color?.nombre ?? color
      imagen = v.imagen_url || prod.imagen_url || imagen
      recargoProd = prod.recargo_cc_pct != null ? Number(prod.recargo_cc_pct) : null
      tramos = tramosByProd.get(prod.id) ?? []
    }
    if (!(lista > 0)) return { ok: false, error: `Sin precio para ${nombre}` }
    const contado = precioConTramo(lista, tramos, cant)
    const recargo = recargoEfectivo(recargoProd, opts.recargoDefault)
    const unitario =
      opts.condicion === 'cuenta_corriente' ? precioConRecargoCc(contado, recargo) : contado
    lineas.push({
      variante_id: it.variante_id,
      producto_nombre: nombre,
      talla,
      color,
      cantidad: cant,
      precio_unitario: unitario,
      total_linea: round2(unitario * cant),
      imagen_url: imagen,
    })
  }
  return { ok: true, lineas }
}

export async function actualizarPedidoCatalogo(input: {
  pedidoId: string
  items: Array<{
    variante_id: string
    cantidad: number
    producto_nombre?: string
    talla?: string | null
    color?: string | null
    imagen_url?: string | null
    precio_unitario?: number
  }>
  notas?: string | null
  direccion_entrega?: string | null
  tipo_entrega?: TipoEntregaCatalogo
}): Promise<ActionResult> {
  try {
    const { supabase, tiendaId } = await requireCtx()
    const { data: pedido } = await supabase
      .from('pedidos_catalogo')
      .select('id, estado, venta_id, tipo_entrega')
      .eq('id', input.pedidoId)
      .eq('tienda_id', tiendaId)
      .maybeSingle()
    if (!pedido) return { ok: false, error: 'Pedido no encontrado' }
    const p = pedido as {
      estado: EstadoPedidoCatalogo
      venta_id: string | null
      tipo_entrega: TipoEntregaCatalogo
    }
    if (p.venta_id || p.estado === 'convertido' || p.estado === 'cancelado') {
      return { ok: false, error: 'Este pedido ya no se puede editar' }
    }
    if (!ESTADOS_EDITABLES.includes(p.estado)) {
      return { ok: false, error: 'Este pedido ya no se puede editar' }
    }

    const costeo = await recostearLineasPedido(supabase, tiendaId, input.items, {
      condicion: 'contado',
      recargoDefault: 0,
    })
    if (!costeo.ok) return { ok: false, error: costeo.error }

    const tipo = input.tipo_entrega ?? p.tipo_entrega
    const direccion =
      tipo === 'envio' ? (input.direccion_entrega?.trim() || null) : null
    if (tipo === 'envio' && (!direccion || direccion.length < MIN_DIRECCION)) {
      return { ok: false, error: 'Ingresá la dirección de entrega' }
    }

    const subtotal = costeo.lineas.reduce((acc, l) => acc + l.total_linea, 0)
    const { error: errDel } = await supabase
      .from('pedido_catalogo_items')
      .delete()
      .eq('pedido_id', input.pedidoId)
      .eq('tienda_id', tiendaId)
    if (errDel) return { ok: false, error: traducirError(errDel.message) }

    const { error: errIns } = await supabase.from('pedido_catalogo_items').insert(
      costeo.lineas.map((l) => ({
        tienda_id: tiendaId,
        pedido_id: input.pedidoId,
        ...l,
      }))
    )
    if (errIns) return { ok: false, error: traducirError(errIns.message) }

    const { error: errUp } = await supabase
      .from('pedidos_catalogo')
      .update({
        notas: input.notas?.trim() || null,
        tipo_entrega: tipo,
        direccion_entrega: direccion,
        subtotal,
        total: subtotal,
      })
      .eq('id', input.pedidoId)
      .eq('tienda_id', tiendaId)
    if (errUp) return { ok: false, error: traducirError(errUp.message) }

    revalidatePath('/pedidos')
    revalidatePath(`/pedidos/${input.pedidoId}`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export async function convertirPedidoAVenta(input: {
  pedidoId: string
  pagos: PagoVentaInput[]
  condicion_pago?: CondicionPago
}): Promise<ActionResult<{ ventaId: string; remitoId?: string }>> {
  try {
    const { supabase, tiendaId } = await requireCtx()
    const { data: pedido } = await supabase
      .from('pedidos_catalogo')
      .select('*')
      .eq('id', input.pedidoId)
      .eq('tienda_id', tiendaId)
      .maybeSingle()
    if (!pedido) return { ok: false, error: 'Pedido no encontrado' }

    const p = pedido as {
      estado: EstadoPedidoCatalogo
      venta_id: string | null
      numero: number
      cliente_nombre: string
      cliente_telefono: string
      cliente_id: string | null
      tipo_entrega: 'retiro' | 'envio'
      direccion_entrega: string | null
      notas: string | null
      total: number
    }

    if (p.venta_id || p.estado === 'convertido') {
      return { ok: false, error: 'Este pedido ya se convirtió en venta' }
    }
    if (p.estado === 'cancelado') {
      return { ok: false, error: 'No se puede convertir un pedido cancelado' }
    }
    if (['nuevo', 'visto'].includes(p.estado)) {
      return { ok: false, error: 'Aceptá el pedido antes de confirmar el envío o retiro' }
    }

    const { data: itemsRaw } = await supabase
      .from('pedido_catalogo_items')
      .select('variante_id, cantidad, precio_unitario, producto_nombre, talla, color, imagen_url')
      .eq('pedido_id', input.pedidoId)
      .eq('tienda_id', tiendaId)

    const items = (itemsRaw ?? []) as Array<{
      variante_id: string | null
      cantidad: number
      precio_unitario: number
      producto_nombre: string
      talla: string | null
      color: string | null
      imagen_url: string | null
    }>
    if (items.length === 0 || items.some((it) => !it.variante_id)) {
      return { ok: false, error: 'El pedido no tiene productos válidos para vender' }
    }

    const { data: tiendaRow } = await supabase
      .from('tiendas')
      .select('rubro')
      .eq('id', tiendaId)
      .maybeSingle()
    const configRubro = getConfigRubro(
      ((tiendaRow as { rubro?: string } | null)?.rubro ?? 'generico') as import('@/lib/rubro/config').Rubro
    )
    const condicion: CondicionPago =
      configRubro.usarPedidoCc && input.condicion_pago === 'cuenta_corriente'
        ? 'cuenta_corriente'
        : 'contado'

    const { data: cfg } = await supabase
      .from('configuracion_tienda')
      .select('recargo_cc_default')
      .eq('tienda_id', tiendaId)
      .maybeSingle()
    const recargoDefault = Number(
      (cfg as { recargo_cc_default?: number } | null)?.recargo_cc_default ?? 0
    )

    const costeo = await recostearLineasPedido(
      supabase,
      tiendaId,
      items.map((it) => ({
        variante_id: it.variante_id as string,
        cantidad: Number(it.cantidad),
        precio_unitario: Number(it.precio_unitario),
        producto_nombre: it.producto_nombre,
        talla: it.talla,
        color: it.color,
        imagen_url: it.imagen_url,
      })),
      { condicion, recargoDefault }
    )
    if (!costeo.ok) return { ok: false, error: costeo.error }

    let clienteId = p.cliente_id
    if (!clienteId) {
      const tel = p.cliente_telefono.trim()
      const { data: existente } = await supabase
        .from('clientes')
        .select('id')
        .eq('tienda_id', tiendaId)
        .eq('telefono', tel)
        .maybeSingle()
      if (existente) {
        clienteId = (existente as { id: string }).id
      } else {
        const creado = await crearCliente({
          nombre: p.cliente_nombre,
          telefono: tel,
          direccion: p.tipo_entrega === 'envio' ? p.direccion_entrega : null,
        })
        if (!creado.ok || !creado.data) {
          return { ok: false, error: creado.error ?? 'No se pudo crear el cliente' }
        }
        clienteId = creado.data.id
      }
      await supabase
        .from('pedidos_catalogo')
        .update({ cliente_id: clienteId })
        .eq('id', input.pedidoId)
        .eq('tienda_id', tiendaId)
    }

    const entregaTxt =
      p.tipo_entrega === 'envio'
        ? `Envío: ${p.direccion_entrega ?? ''}`
        : 'Retiro en local'
    const venta = await registrarVenta({
      items: costeo.lineas.map((it) => ({
        variante_id: it.variante_id,
        cantidad: it.cantidad,
        precio_unitario: it.precio_unitario,
      })),
      pagos: input.pagos,
      cliente_id: clienteId,
      condicion_pago: condicion,
      observaciones: `Pedido catálogo #${p.numero}. ${entregaTxt}${p.notas ? `. ${p.notas}` : ''}`,
      remito_direccion_entrega: p.tipo_entrega === 'envio' ? p.direccion_entrega : null,
      remito_telefono_entrega: p.cliente_telefono,
    })

    if (!venta.ok || !venta.data) {
      return { ok: false, error: venta.error ?? 'No se pudo registrar la venta' }
    }

    const ventaId = venta.data.ventaId
    let remitoId: string | undefined = venta.data.remitoId

    const ctx = await getContextoTienda()
    const puedeRemitos = ctx ? puedeUsar(ctx.planEfectivo, 'remitos') : false

    if (
      p.tipo_entrega === 'envio' &&
      puedeRemitos &&
      !configRubro.remitoAutoVenta &&
      !remitoId
    ) {
      const totalLineas = costeo.lineas.reduce((acc, l) => acc + l.total_linea, 0)
      const cobrado = (input.pagos ?? []).reduce((acc, pgo) => acc + Number(pgo.monto || 0), 0)
      const rem = await crearRemitoDesdeVenta({
        ventaId,
        clienteId,
        tipo: condicion === 'cuenta_corriente' ? 'cuenta_corriente' : 'entrega',
        destinatario: p.cliente_nombre,
        montoTotal: totalLineas,
        montoCobrado: Math.min(cobrado, totalLineas),
        observaciones: `Pedido catálogo #${p.numero}`,
        direccion_entrega: p.direccion_entrega,
        telefono_entrega: p.cliente_telefono,
        items: costeo.lineas.map((it) => ({
          nombre_producto: it.producto_nombre,
          talla: it.talla,
          color: it.color,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
        })),
      })
      remitoId = rem.remitoId
    }

    if (!remitoId) {
      const { data: remAuto } = await supabase
        .from('remitos')
        .select('id')
        .eq('tienda_id', tiendaId)
        .eq('venta_id', ventaId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      remitoId = (remAuto as { id: string } | null)?.id
    }

    const { error: errUp } = await supabase
      .from('pedidos_catalogo')
      .update({
        estado: 'convertido',
        venta_id: ventaId,
        remito_id: remitoId ?? null,
        cliente_id: clienteId,
        condicion_pago: condicion,
      })
      .eq('id', input.pedidoId)
      .eq('tienda_id', tiendaId)

    if (errUp) {
      return {
        ok: false,
        error: `Venta registrada pero no se pudo vincular el pedido: ${traducirError(errUp.message)}`,
      }
    }

    revalidatePath('/pedidos')
    revalidatePath(`/pedidos/${input.pedidoId}`)
    revalidatePath('/ventas')
    revalidatePath('/remitos')
    return { ok: true, data: { ventaId, remitoId } }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}
