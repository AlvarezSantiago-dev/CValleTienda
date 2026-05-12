'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { buscarVariantes, type VarianteResultado } from '@/lib/pos/queries'

export interface ActionResult<T = unknown> {
  ok: boolean
  error?: string
  data?: T
}

export interface ItemVentaInput {
  variante_id: string
  cantidad: number
  /** precio por unidad. Si se omite, se usa el de la variante. */
  precio_unitario?: number
  /** Descuento monetario por línea (no porcentual). */
  descuento_linea?: number
}

export interface PagoVentaInput {
  metodo_pago_id: string
  monto: number
  referencia?: string | null
}

export interface RegistrarVentaInput {
  items: ItemVentaInput[]
  pagos: PagoVentaInput[]
  cliente_id?: string | null
  descuento_global?: number
  observaciones?: string | null
  /** Monto de saldo a favor del cliente a descontar en esta venta */
  saldo_favor_usado?: number
}

interface VarianteRow {
  id: string
  producto_id: string
  codigo_barras: string | null
  precio_venta: number | null
  stock_actual: number
  producto_nombre: string
  talla_nombre: string | null
  color_nombre: string | null
  precio_efectivo: number
  costo_unitario: number
}

interface MetodoPagoRow {
  id: string
  nombre: string
  comision_porcentaje: number
  dias_acreditacion: number
  cuenta_fondo_id: string
  cuenta_fondo_nombre: string
  cuenta_tipo: string
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
  return {
    supabase,
    tiendaId: perfil.tienda_id as string,
    userId: auth.user.id,
  }
}

function traducirError(msg?: string | null): string {
  if (!msg) return 'Error desconocido'
  if (msg.includes('Stock insuficiente')) return msg // ya viene en español
  if (msg.includes('row-level security')) return 'No tenés permisos para esta operación'
  if (msg.includes('ventas_numero_ticket_unique')) return 'Conflicto de número de ticket. Reintentá.'
  return msg
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

async function cargarVariantes(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tiendaId: string,
  ids: string[]
): Promise<Map<string, VarianteRow>> {
  if (ids.length === 0) return new Map()
  const { data, error } = await supabase
    .from('variantes_producto')
    .select(
      'id, producto_id, codigo_barras, precio_venta, stock_actual, ' +
        'producto:productos!inner(nombre, precio_venta, precio_compra), ' +
        'talla:tallas(nombre), color:colores(nombre)'
    )
    .eq('tienda_id', tiendaId)
    .in('id', ids)

  if (error) throw new Error(error.message)

  const map = new Map<string, VarianteRow>()
  for (const r of ((data ?? []) as unknown as Array<Record<string, unknown>>)) {
    const prod = (Array.isArray(r.producto) ? r.producto[0] : r.producto) as
      | Record<string, unknown>
      | null
    const talla = (Array.isArray(r.talla) ? r.talla[0] : r.talla) as
      | Record<string, unknown>
      | null
    const color = (Array.isArray(r.color) ? r.color[0] : r.color) as
      | Record<string, unknown>
      | null

    const precioVar = r.precio_venta != null ? Number(r.precio_venta) : null
    const precioProd = prod?.precio_venta != null ? Number(prod.precio_venta as number) : 0
    const precio = precioVar != null && precioVar > 0 ? precioVar : precioProd

    map.set(r.id as string, {
      id: r.id as string,
      producto_id: r.producto_id as string,
      codigo_barras: (r.codigo_barras as string | null) ?? null,
      precio_venta: precioVar,
      stock_actual: Number(r.stock_actual ?? 0),
      producto_nombre: (prod?.nombre as string) ?? 'Producto',
      talla_nombre: (talla?.nombre as string | null) ?? null,
      color_nombre: (color?.nombre as string | null) ?? null,
      precio_efectivo: precio,
      costo_unitario: prod?.precio_compra != null ? Number(prod.precio_compra as number) : 0,
    })
  }
  return map
}

async function cargarMetodosPago(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tiendaId: string,
  ids: string[]
): Promise<Map<string, MetodoPagoRow>> {
  if (ids.length === 0) return new Map()
  const { data, error } = await supabase
    .from('metodos_pago')
    .select(
      'id, nombre, comision_porcentaje, dias_acreditacion, cuenta_fondo_id, activo, ' +
        'cuenta:cuentas_fondos!inner(nombre, tipo, activo)'
    )
    .eq('tienda_id', tiendaId)
    .in('id', ids)

  if (error) throw new Error(error.message)

  const map = new Map<string, MetodoPagoRow>()
  for (const r of ((data ?? []) as unknown as Array<Record<string, unknown>>)) {
    if (r.activo === false) continue
    const cuenta = (Array.isArray(r.cuenta) ? r.cuenta[0] : r.cuenta) as
      | Record<string, unknown>
      | null
    if (!cuenta || cuenta.activo === false) continue

    map.set(r.id as string, {
      id: r.id as string,
      nombre: r.nombre as string,
      comision_porcentaje: Number(r.comision_porcentaje ?? 0),
      dias_acreditacion: Number(r.dias_acreditacion ?? 0),
      cuenta_fondo_id: r.cuenta_fondo_id as string,
      cuenta_fondo_nombre: (cuenta.nombre as string) ?? 'Cuenta',
      cuenta_tipo: (cuenta.tipo as string) ?? 'efectivo',
    })
  }
  return map
}

export async function registrarVenta(
  input: RegistrarVentaInput
): Promise<ActionResult<{ ventaId: string; numeroTicket: number }>> {
  try {
    // ---- Validaciones de input ----
    if (!Array.isArray(input.items) || input.items.length === 0) {
      return { ok: false, error: 'La venta debe tener al menos un producto' }
    }
    if (!Array.isArray(input.pagos) || (input.pagos.length === 0 && !(input.saldo_favor_usado && input.saldo_favor_usado > 0))) {
      return { ok: false, error: 'La venta debe tener al menos un pago' }
    }

    for (const it of input.items) {
      if (!it.variante_id) return { ok: false, error: 'Falta el ID de variante en un ítem' }
      const cant = Number(it.cantidad)
      if (!Number.isFinite(cant) || cant <= 0) {
        return { ok: false, error: 'La cantidad debe ser mayor a 0' }
      }
    }

    for (const p of input.pagos) {
      if (!p.metodo_pago_id) return { ok: false, error: 'Falta método de pago' }
      const m = Number(p.monto)
      if (!Number.isFinite(m) || m <= 0) {
        return { ok: false, error: 'El monto del pago debe ser mayor a 0' }
      }
    }

    const descuentoGlobal = Math.max(0, Number(input.descuento_global ?? 0))
    if (!Number.isFinite(descuentoGlobal)) {
      return { ok: false, error: 'Descuento global inválido' }
    }

    const saldoFavorUsado = Math.max(0, round2(Number(input.saldo_favor_usado ?? 0)))
    if (!Number.isFinite(saldoFavorUsado)) {
      return { ok: false, error: 'Saldo a favor inválido' }
    }
    if (saldoFavorUsado > 0 && !input.cliente_id) {
      return { ok: false, error: 'Se necesita un cliente para usar el saldo a favor' }
    }

    const { supabase, tiendaId, userId } = await requireCtx()

    // ---- Sesión de caja abierta ----
    const { data: sesion } = await supabase
      .from('sesiones_caja')
      .select('id')
      .eq('tienda_id', tiendaId)
      .eq('estado', 'abierta')
      .maybeSingle()

    if (!sesion) {
      return { ok: false, error: 'No hay caja abierta. Abrí una sesión antes de vender.' }
    }
    const sesionId = (sesion as { id: string }).id

    // ---- Cargar variantes y métodos para snapshot + validaciones ----
    const variantes = await cargarVariantes(
      supabase,
      tiendaId,
      input.items.map((i) => i.variante_id)
    )

    for (const it of input.items) {
      const v = variantes.get(it.variante_id)
      if (!v) {
        return { ok: false, error: 'Una variante seleccionada ya no está disponible' }
      }
      if (v.stock_actual < Number(it.cantidad)) {
        return {
          ok: false,
          error: `Stock insuficiente para "${v.producto_nombre}". Disponible: ${v.stock_actual}`,
        }
      }
    }

    const metodos = await cargarMetodosPago(
      supabase,
      tiendaId,
      input.pagos.map((p) => p.metodo_pago_id)
    )
    for (const p of input.pagos) {
      if (!metodos.has(p.metodo_pago_id)) {
        return { ok: false, error: 'Método de pago inválido o inactivo' }
      }
    }

    // ---- Calcular totales ----
    let subtotal = 0
    const lineas = input.items.map((it) => {
      const v = variantes.get(it.variante_id)!
      const precio =
        it.precio_unitario != null && Number(it.precio_unitario) > 0
          ? Number(it.precio_unitario)
          : v.precio_efectivo
      const cantidad = Number(it.cantidad)
      const descLinea = Math.max(0, Number(it.descuento_linea ?? 0))
      const totalLinea = round2(precio * cantidad - descLinea)
      subtotal += totalLinea
      return {
        v,
        cantidad,
        precio_unitario: round2(precio),
        descuento_linea: round2(descLinea),
        total_linea: Math.max(0, totalLinea),
        costo_unitario: round2(v.costo_unitario),
      }
    })

    const total = Math.max(0, round2(subtotal - descuentoGlobal))
    const sumaPagosEfectivos = input.pagos.reduce((acc, p) => acc + Number(p.monto), 0)
    const sumaPagos = round2(sumaPagosEfectivos + saldoFavorUsado)

    if (sumaPagos + 0.01 < total) {
      return {
        ok: false,
        error: `El total cobrado ($${round2(sumaPagos)}) es menor al total de la venta ($${total})`,
      }
    }

    // Si hay exceso (vuelto), solo se permite si todo el exceso cabe en métodos efectivo
    const exceso = round2(sumaPagos - total)
    if (exceso > 0.01) {
      const totalEfectivo = input.pagos
        .filter((p) => metodos.get(p.metodo_pago_id)?.cuenta_tipo === 'efectivo')
        .reduce((acc, p) => acc + Number(p.monto), 0)
      if (totalEfectivo + 0.01 < exceso) {
        return {
          ok: false,
          error:
            'El vuelto solo puede salir de pagos en efectivo. Ajustá los montos para que el total no se exceda.',
        }
      }
    }

    // ---- Obtener número de ticket atómico ----
    const { data: numTicket, error: errTicket } = await supabase.rpc(
      'get_siguiente_numero_ticket',
      { p_tienda_id: tiendaId }
    )
    if (errTicket || numTicket == null) {
      return {
        ok: false,
        error: traducirError(errTicket?.message ?? 'No se pudo obtener número de ticket'),
      }
    }
    const numeroTicket = Number(numTicket)

    // ---- INSERT venta ----
    const { data: ventaIns, error: errVenta } = await supabase
      .from('ventas')
      .insert({
        tienda_id: tiendaId,
        cliente_id: input.cliente_id ?? null,
        usuario_id: userId,
        sesion_caja_id: sesionId,
        numero_ticket: numeroTicket,
        subtotal: round2(subtotal),
        descuento: round2(descuentoGlobal),
        total,
        estado: 'completada',
        observaciones: input.observaciones?.trim() || null,
      })
      .select('id')
      .maybeSingle()

    if (errVenta || !ventaIns) {
      return { ok: false, error: traducirError(errVenta?.message) }
    }
    const ventaId = (ventaIns as { id: string }).id

    // ---- INSERT detalles_venta (uno por uno para capturar errores de stock por trigger) ----
    for (const ln of lineas) {
      const { error: errDet } = await supabase.from('detalles_venta').insert({
        tienda_id: tiendaId,
        venta_id: ventaId,
        variante_id: ln.v.id,
        nombre_producto: ln.v.producto_nombre,
        codigo_barras: ln.v.codigo_barras,
        talla: ln.v.talla_nombre,
        color: ln.v.color_nombre,
        cantidad: ln.cantidad,
        precio_unitario: ln.precio_unitario,
        descuento_linea: ln.descuento_linea,
        total_linea: ln.total_linea,
        costo_unitario: ln.costo_unitario,
      })
      if (errDet) {
        // Intentar limpiar la venta huérfana
        await supabase.from('ventas').delete().eq('id', ventaId).eq('tienda_id', tiendaId)
        return { ok: false, error: traducirError(errDet.message) }
      }
    }

    // ---- INSERT pagos_venta (con snapshots y comisión calculada) ----
    for (const p of input.pagos) {
      const m = metodos.get(p.metodo_pago_id)!
      const monto = round2(Number(p.monto))
      const comision = round2((monto * m.comision_porcentaje) / 100)
      const neto = round2(monto - comision)

      const { error: errPago } = await supabase.from('pagos_venta').insert({
        tienda_id: tiendaId,
        venta_id: ventaId,
        metodo_pago_id: m.id,
        cuenta_fondo_id: m.cuenta_fondo_id,
        nombre_metodo: m.nombre,
        nombre_cuenta_fondo: m.cuenta_fondo_nombre,
        comision_porcentaje: m.comision_porcentaje,
        dias_acreditacion: m.dias_acreditacion,
        monto,
        comision_calculada: comision,
        monto_neto: neto,
        referencia: p.referencia?.trim() || null,
      })
      if (errPago) {
        // No revertimos detalles porque el trigger ya descontó stock; mejor dejar la venta
        // y reportar error claro para que el operador la anule manualmente si hace falta.
        return {
          ok: false,
          error: `Venta registrada pero falló un pago: ${traducirError(errPago.message)}`,
        }
      }
    }

    revalidatePath('/pos')
    revalidatePath('/ventas')
    revalidatePath('/caja')
    revalidatePath('/', 'layout')

    // ---- Descontar saldo a favor si corresponde ----
    if (saldoFavorUsado > 0 && input.cliente_id) {
      const { error: errSaldo } = await supabase.rpc('descontar_saldo_favor', {
        p_cliente_id: input.cliente_id,
        p_tienda_id: tiendaId,
        p_monto: saldoFavorUsado,
      })
      if (errSaldo) {
        // La venta ya está registrada; reportar el error sin revertir
        return {
          ok: false,
          error: `Venta registrada pero no se pudo descontar el saldo a favor: ${traducirError(errSaldo.message)}`,
        }
      }
      revalidatePath(`/clientes`)
      revalidatePath(`/clientes/${input.cliente_id}`)
    }

    return { ok: true, data: { ventaId, numeroTicket } }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

/**
 * Acción server invocable desde el cliente para buscar variantes (POS).
 */
export async function buscarVariantesAction(
  query: string
): Promise<ActionResult<VarianteResultado[]>> {
  try {
    const data = await buscarVariantes(query, 20)
    return { ok: true, data }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

export interface ClienteLite {
  id: string
  nombre: string
  apellido: string | null
  dni: string | null
  telefono: string | null
  saldo_favor: number
}

/**
 * Busca clientes por nombre/dni/teléfono para asignar a una venta (opcional).
 */
export async function buscarClientesAction(
  query: string
): Promise<ActionResult<ClienteLite[]>> {
  try {
    const q = query.trim()
    if (!q) return { ok: true, data: [] }
    const { supabase, tiendaId } = await requireCtx()
    const pattern = `%${q}%`
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nombre, apellido, dni, telefono, saldo_favor')
      .eq('tienda_id', tiendaId)
      .or(`nombre.ilike.${pattern},apellido.ilike.${pattern},dni.ilike.${pattern},telefono.ilike.${pattern}`)
      .limit(10)
    if (error) return { ok: false, error: error.message }
    return {
      ok: true,
      data: ((data ?? []) as Array<Record<string, unknown>>).map((c) => ({
        id: c.id as string,
        nombre: (c.nombre as string) ?? '',
        apellido: (c.apellido as string | null) ?? null,
        dni: (c.dni as string | null) ?? null,
        telefono: (c.telefono as string | null) ?? null,
        saldo_favor: Number(c.saldo_favor ?? 0),
      })),
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
