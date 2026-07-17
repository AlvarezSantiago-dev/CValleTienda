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
  /**
   * Cuántas unidades físicas contiene 1 pack.
   * Si se envía, la cantidad del carrito son packs y el precio es el del pack;
   * el servidor usa pack_size para validar el stock real y descontar las unidades correctas.
   */
  pack_size?: number
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
  es_bundle: boolean
  es_kit: boolean
  componentes: Array<{
    componente_variante_id: string
    cantidad: number
    comp_stock_actual: number
    comp_precio_compra: number
  }>
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
        'producto:productos!inner(nombre, precio_venta, precio_compra, es_bundle, es_kit), ' +
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
      es_bundle: (prod?.es_bundle as boolean) ?? false,
      es_kit: (prod?.es_kit as boolean) ?? false,
      componentes: [],
    })
  }

  // Para bundles, cargar componentes con stock y costo
  const bundleIds = Array.from(map.values()).filter((v) => v.es_bundle).map((v) => v.id)
  if (bundleIds.length > 0) {
    const { data: comps } = await supabase
      .from('producto_componentes')
      .select(
        'variante_bundle_id, componente_variante_id, cantidad, ' +
          'comp:variantes_producto!componente_variante_id(' +
            'stock_actual, producto:productos!inner(precio_compra)' +
          ')'
      )
      .in('variante_bundle_id', bundleIds)
      .eq('tienda_id', tiendaId)

    for (const row of ((comps ?? []) as unknown as Array<Record<string, unknown>>)) {
      const bundleRow = map.get(row.variante_bundle_id as string)
      if (!bundleRow) continue
      const comp = (Array.isArray(row.comp) ? row.comp[0] : row.comp) as Record<string, unknown> | null
      const compProd = comp ? (Array.isArray(comp.producto) ? comp.producto[0] : comp.producto) as Record<string, unknown> | null : null
      bundleRow.componentes.push({
        componente_variante_id: row.componente_variante_id as string,
        cantidad: Number(row.cantidad),
        comp_stock_actual: Number(comp?.stock_actual ?? 0),
        comp_precio_compra: Number(compProd?.precio_compra ?? 0),
      })
    }
  }

  // Para kits, cargar componentes de kit_componentes
  const kitIds = Array.from(map.values()).filter((v) => v.es_kit).map((v) => v.id)
  if (kitIds.length > 0) {
    const { data: kitComps } = await supabase
      .from('kit_componentes')
      .select(
        'kit_variante_id, componente_variante_id, cantidad, ' +
          'comp:variantes_producto!componente_variante_id(' +
            'stock_actual, producto:productos!inner(precio_compra)' +
          ')'
      )
      .in('kit_variante_id', kitIds)
      .eq('tienda_id', tiendaId)

    for (const row of ((kitComps ?? []) as unknown as Array<Record<string, unknown>>)) {
      const kitRow = map.get(row.kit_variante_id as string)
      if (!kitRow) continue
      const comp = (Array.isArray(row.comp) ? row.comp[0] : row.comp) as Record<string, unknown> | null
      const compProd = comp ? (Array.isArray(comp.producto) ? comp.producto[0] : comp.producto) as Record<string, unknown> | null : null
      kitRow.componentes.push({
        componente_variante_id: row.componente_variante_id as string,
        cantidad: Number(row.cantidad),
        comp_stock_actual: Number(comp?.stock_actual ?? 0),
        comp_precio_compra: Number(compProd?.precio_compra ?? 0),
      })
    }
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

    // Una variante puede llegar en dos líneas (pack + remanente unitario).
    // Validar el consumo físico agregado evita aprobar ambas líneas por separado
    // contra el mismo stock inicial.
    const consumoFisicoPorVariante = new Map<string, number>()
    for (const item of input.items) {
      const variante = variantes.get(item.variante_id)
      if (!variante || variante.es_bundle || variante.es_kit) continue
      const cantidad = Number(item.cantidad)
      const packSize = Number(item.pack_size ?? 1)
      const cantidadFisica = packSize > 1 ? Math.round(cantidad * packSize) : cantidad
      consumoFisicoPorVariante.set(
        item.variante_id,
        (consumoFisicoPorVariante.get(item.variante_id) ?? 0) + cantidadFisica
      )
    }
    for (const [varianteId, consumoFisico] of consumoFisicoPorVariante) {
      const variante = variantes.get(varianteId)!
      if (variante.stock_actual < consumoFisico) {
        return {
          ok: false,
          error: `Stock insuficiente para "${variante.producto_nombre}". Disponible: ${variante.stock_actual}`,
        }
      }
    }

    for (const it of input.items) {
      const v = variantes.get(it.variante_id)
      if (!v) {
        return { ok: false, error: 'Una variante seleccionada ya no está disponible' }
      }
      const cantidad = Number(it.cantidad)
      if (v.es_bundle) {
        // Para bundles, validar el stock de cada componente
        if (v.componentes.length === 0) {
          return { ok: false, error: `"${v.producto_nombre}" es un bundle sin componentes configurados` }
        }
        for (const comp of v.componentes) {
          const compDisponible = Math.floor(comp.comp_stock_actual / comp.cantidad)
          if (compDisponible < cantidad) {
            return {
              ok: false,
              error: `Stock insuficiente de un componente de "${v.producto_nombre}". Packs disponibles: ${compDisponible}`,
            }
          }
        }
      } else if (v.es_kit) {
        // Para kits, validar stock mínimo entre componentes
        if (v.componentes.length === 0) {
          return { ok: false, error: `"${v.producto_nombre}" es un kit sin componentes configurados` }
        }
        const stockEfectivoKit = Math.min(
          ...v.componentes.map((c) => Math.floor(c.comp_stock_actual / c.cantidad))
        )
        if (stockEfectivoKit < cantidad) {
          return {
            ok: false,
            error: `Stock insuficiente para el kit "${v.producto_nombre}". Kits disponibles: ${stockEfectivoKit}`,
          }
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
      // Para bundles: costo = suma de (precio_compra_comp * cant_comp)
      // Para kits: costo = suma de (precio_compra_comp * cant_comp)
      const costoUnitario = (v.es_bundle || v.es_kit)
        ? round2(v.componentes.reduce((acc, c) => acc + c.comp_precio_compra * c.cantidad, 0))
        : round2(v.costo_unitario)
      return {
        v,
        cantidad,
        pack_size: Number(it.pack_size ?? 1),
        precio_unitario: round2(precio),
        descuento_linea: round2(descLinea),
        total_linea: Math.max(0, totalLinea),
        costo_unitario: costoUnitario,
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
    let cuentaVueltoId: string | null = null

    if (exceso > 0.01) {
      const efectivoPagos = input.pagos.filter(
        (p) => metodos.get(p.metodo_pago_id)?.cuenta_tipo === 'efectivo'
      )
      const totalEfectivo = round2(
        efectivoPagos.reduce((acc, p) => acc + Number(p.monto), 0)
      )
      if (totalEfectivo + 0.01 < exceso) {
        return {
          ok: false,
          error:
            'El vuelto solo puede salir de pagos en efectivo. Ajustá los montos para que el total no se exceda.',
        }
      }
      cuentaVueltoId = efectivoPagos[0]?.metodo_pago_id
        ? metodos.get(efectivoPagos[0].metodo_pago_id)?.cuenta_fondo_id ?? null
        : null
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
        cajero_id: userId,
        sesion_caja_id: sesionId,
        numero_ticket: numeroTicket,
        subtotal: round2(subtotal),
        descuento: round2(descuentoGlobal),
        total,
        saldo_favor_usado: saldoFavorUsado,
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
      // Para packs: expandir a unidades físicas enteras y guardar precio por unidad individual.
      // Para peso/decimal: preservar cantidad original (ej: 0.235 kg).
      const cantidadFisica = ln.pack_size > 1 ? Math.round(ln.cantidad * ln.pack_size) : ln.cantidad
      const precioUnitarioFisico = ln.pack_size > 1
        ? round2(ln.precio_unitario / ln.pack_size)
        : ln.precio_unitario
      const { error: errDet } = await supabase.from('detalles_venta').insert({
        tienda_id: tiendaId,
        venta_id: ventaId,
        variante_id: ln.v.id,
        nombre_producto: ln.v.producto_nombre,
        codigo_barras: ln.v.codigo_barras,
        talla: ln.v.talla_nombre,
        color: ln.v.color_nombre,
        cantidad: cantidadFisica,
        precio_unitario: precioUnitarioFisico,
        descuento_linea: ln.descuento_linea,
        total_linea: ln.total_linea,
        costo_unitario: ln.costo_unitario,
      })
      if (errDet) {
        // Intentar limpiar la venta huérfana
        await supabase.from('ventas').delete().eq('id', ventaId).eq('tienda_id', tiendaId)
        return { ok: false, error: traducirError(errDet.message) }
      }

      // Para kits: el trigger saltea el stock del kit (es_kit=true).
      // Descontamos manualmente el stock de cada componente y registramos movimiento.
      if (ln.v.es_kit && ln.v.componentes.length > 0) {
        for (const comp of ln.v.componentes) {
          const cantComp = cantidadFisica * comp.cantidad

          // Obtener stock actual del componente para el movimiento
          const { data: compRow } = await supabase
            .from('variantes_producto')
            .select('stock_actual')
            .eq('id', comp.componente_variante_id)
            .eq('tienda_id', tiendaId)
            .maybeSingle()
          const stockAntComp = Number((compRow as { stock_actual: number } | null)?.stock_actual ?? 0)

          const { error: errStock } = await supabase
            .from('variantes_producto')
            .update({ stock_actual: stockAntComp - cantComp, updated_at: new Date().toISOString() })
            .eq('id', comp.componente_variante_id)
            .eq('tienda_id', tiendaId)
            .gte('stock_actual', cantComp)  // evitar stock negativo

          if (errStock) {
            await supabase.from('ventas').delete().eq('id', ventaId).eq('tienda_id', tiendaId)
            return { ok: false, error: `Stock insuficiente en un componente del kit "${ln.v.producto_nombre}"` }
          }

          await supabase.from('movimientos_stock').insert({
            tienda_id: tiendaId,
            variante_id: comp.componente_variante_id,
            tipo: 'salida',
            cantidad: -cantComp,
            stock_anterior: stockAntComp,
            stock_posterior: stockAntComp - cantComp,
            motivo: `Venta #${numeroTicket} (componente kit "${ln.v.producto_nombre}")`,
            venta_id: ventaId,
            usuario_id: userId,
          })
        }
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

    if (exceso > 0.01 && cuentaVueltoId) {
      const { error: errVuelto } = await supabase.rpc('registrar_movimiento_fondo', {
        p_cuenta_fondo_id: cuentaVueltoId,
        p_tipo: 'egreso',
        p_concepto: `Vuelto venta #${numeroTicket}`,
        p_monto: exceso,
        p_venta_id: ventaId,
        p_usuario_id: userId,
      })
      if (errVuelto) {
        return {
          ok: false,
          error: `Venta registrada pero falló el registro del vuelto: ${traducirError(errVuelto.message)}`,
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
 * Anula una venta completada.
 * Los triggers de DB se encargan de: revertir stock y decrementar métricas del cliente.
 */
export async function anularVenta(ventaId: string): Promise<ActionResult> {
  try {
    if (!ventaId) return { ok: false, error: 'Falta el ID de la venta' }

    const { supabase, tiendaId } = await requireCtx()

    const { data: ventaRow, error: errGet } = await supabase
      .from('ventas')
      .select('id, estado, numero_ticket, cliente_id, saldo_favor_usado')
      .eq('tienda_id', tiendaId)
      .eq('id', ventaId)
      .maybeSingle()

    if (errGet) return { ok: false, error: traducirError(errGet.message) }
    if (!ventaRow) return { ok: false, error: 'Venta no encontrada' }

    const v = ventaRow as {
      id: string
      estado: string
      numero_ticket: number
      cliente_id: string | null
      saldo_favor_usado: number | null
    }
    if (v.estado === 'anulada') return { ok: false, error: 'La venta ya está anulada' }
    if (v.estado !== 'completada') {
      return { ok: false, error: 'Solo se pueden anular ventas completadas' }
    }

    const { error: errUpd } = await supabase
      .from('ventas')
      .update({ estado: 'anulada' })
      .eq('tienda_id', tiendaId)
      .eq('id', ventaId)

    if (errUpd) return { ok: false, error: traducirError(errUpd.message) }

    // Revertir saldo a favor acreditado por devoluciones de esta venta
    await supabase.rpc('revertir_saldo_favor_de_venta', {
      p_venta_id: ventaId,
      p_tienda_id: tiendaId,
    })
    // No bloqueamos el flujo si falla — la venta ya quedó anulada

    // Si la venta consumió saldo a favor del cliente, restituirlo
    const saldoConsumido = Number(v.saldo_favor_usado ?? 0)
    if (saldoConsumido > 0 && v.cliente_id) {
      await supabase.rpc('incrementar_saldo_favor', {
        p_cliente_id: v.cliente_id,
        p_tienda_id: tiendaId,
        p_monto: saldoConsumido,
      })
      revalidatePath(`/clientes/${v.cliente_id}`)
    }

    revalidatePath('/ventas')
    revalidatePath(`/ventas/${ventaId}`)
    revalidatePath('/stock')
    revalidatePath('/clientes')
    revalidatePath('/dashboard')

    return { ok: true }
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

/**
 * Busca una variante por el código interno de balanza (PLU).
 * Primero intenta coincidir con `codigo_barras LIKE '2{codigoInterno}%'`,
 * luego con `codigo_base = codigoInterno` del producto padre.
 * Devuelve la primera variante activa encontrada o null.
 */
export async function buscarVarianteBalanzaAction(
  codigoInterno: string
): Promise<ActionResult<VarianteResultado | null>> {
  try {
    if (!codigoInterno || !/^\d{5}$/.test(codigoInterno)) {
      return { ok: true, data: null }
    }
    const { supabase, tiendaId } = await requireCtx()

    const SELECT_V =
      'id, producto_id, codigo_barras, precio_venta, stock_actual, activo, ' +
      'producto:productos!inner(id, nombre, codigo_base, precio_venta, unidad_de_medida, activo), ' +
      'talla:tallas(id, nombre), color:colores(id, nombre, hex_color)'

    // Intento 1: código de barras que empiece con "2{codigoInterno}"
    const prefijo = `2${codigoInterno}`
    const { data: porCodigo } = await supabase
      .from('variantes_producto')
      .select(SELECT_V)
      .eq('tienda_id', tiendaId)
      .like('codigo_barras', `${prefijo}%`)
      .eq('activo', true)
      .limit(1)
      .maybeSingle()

    if (porCodigo) {
      return { ok: true, data: mapVarianteRaw(porCodigo) }
    }

    // Intento 2: código_base del producto coincide con el PLU
    const { data: porBase } = await supabase
      .from('variantes_producto')
      .select(SELECT_V)
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .eq('producto.codigo_base', codigoInterno)
      .limit(1)
      .maybeSingle()

    if (porBase) {
      return { ok: true, data: mapVarianteRaw(porBase) }
    }

    return { ok: true, data: null }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// Helper local para mapear el raw de Supabase a VarianteResultado
function mapVarianteRaw(raw: unknown): VarianteResultado {
  const r = raw as Record<string, unknown>
  const producto = (Array.isArray(r.producto) ? r.producto[0] : r.producto) as Record<string, unknown> | null
  const talla = (Array.isArray(r.talla) ? r.talla[0] : r.talla) as Record<string, unknown> | null
  const color = (Array.isArray(r.color) ? r.color[0] : r.color) as Record<string, unknown> | null
  const precioVar = r.precio_venta != null ? Number(r.precio_venta) : null
  const precioProd = producto?.precio_venta != null ? Number(producto.precio_venta as number) : 0
  const precio = precioVar != null && precioVar > 0 ? precioVar : precioProd
  return {
    id: r.id as string,
    producto_id: (producto?.id as string) ?? '',
    producto_nombre: (producto?.nombre as string) ?? '',
    codigo_base: (producto?.codigo_base as string | null) ?? null,
    codigo_barras: (r.codigo_barras as string | null) ?? null,
    talla: (talla?.nombre as string | null) ?? null,
    color: (color?.nombre as string | null) ?? null,
    color_hex: null,
    precio_venta: precio,
    stock_actual: Number(r.stock_actual ?? 0),
    unidad_de_medida: (producto?.unidad_de_medida as string) ?? 'unidad',
    stock_efectivo: Number(r.stock_actual ?? 0),
    es_pack: false,
    pack_habilitado: false,
    pack_cantidad: null,
    pack_precio: null,
    pack_codigo_barras: null,
    es_kit: false,
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
