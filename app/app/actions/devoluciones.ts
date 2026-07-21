'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  calcularSubtipoCambioCabecera,
  preciosCoinciden,
  type SubtipoCambioLinea,
} from '@/lib/devoluciones/cambio-variante'
import {
  obtenerVarianteEntregaParaValidacion,
  obtenerVariantesParaCambio,
  type VarianteCambioOpcion,
} from '@/lib/devoluciones/queries-cambio'
import { tieneStockSuficiente } from '@/lib/stock/infinito'
import { rubroPermiteStockInfinito } from '@/lib/rubro/config'

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
  const tiendaId = perfil.tienda_id as string
  const { data: tienda } = await supabase
    .from('tiendas')
    .select('rubro')
    .eq('id', tiendaId)
    .maybeSingle()
  const permiteInfinito = rubroPermiteStockInfinito(
    (tienda as { rubro?: string } | null)?.rubro
  )
  return {
    supabase,
    tiendaId,
    userId: auth.user.id,
    permiteInfinito,
  }
}

function traducirError(msg?: string | null): string {
  if (!msg) return 'Error desconocido'
  if (msg.includes('row-level security') || msg.includes('permiso denegado'))
    return 'No tenés permisos para esta operación'
  if (msg.includes('Saldo insuficiente'))
    return 'La cuenta de fondos no tiene saldo suficiente para devolver el dinero'
  return msg
}

function round2(n: number) {
  return Math.round(Number(n) * 100) / 100
}

export interface DevolucionLineaInput {
  detalle_venta_id: string
  cantidad: number
  subtipo_cambio?: SubtipoCambioLinea
  variante_entrega_id?: string | null
}

export interface DevolucionPagoInput {
  metodo_pago_id: string
  monto: number
  referencia?: string | null
}

export interface RegistrarDevolucionInput {
  venta_id: string
  cliente_id?: string | null
  motivo: string
  tipo_resolucion: 'reembolso' | 'saldo_a_favor' | 'cambio'
  lineas: DevolucionLineaInput[]
  pagos: DevolucionPagoInput[]
}

interface DetalleVentaRow {
  id: string
  variante_id: string | null
  nombre_producto: string
  codigo_barras: string | null
  talla: string | null
  color: string | null
  cantidad: number
  precio_unitario: number
  producto_id: string | null
  es_kit_o_bundle: boolean
}

interface LineaInsertPayload {
  detalle: DetalleVentaRow
  cantidad: number
  total_linea: number
  subtipo_cambio: SubtipoCambioLinea | null
  variante_entrega_id: string | null
  nombre_producto_entrega: string | null
  talla_entrega: string | null
  color_entrega: string | null
  codigo_barras_entrega: string | null
}

export async function listarVariantesCambio(
  detalleVentaId: string,
  cantidad: number
): Promise<ActionResult<VarianteCambioOpcion[]>> {
  try {
    if (!detalleVentaId) return { ok: false, error: 'Falta línea de venta' }
    const c = Number(cantidad)
    if (!Number.isFinite(c) || c <= 0) {
      return { ok: false, error: 'Cantidad inválida' }
    }

    const { supabase, tiendaId } = await requireCtx()

    const { data: detRaw, error: errDet } = await supabase
      .from('detalles_venta')
      .select('id, variante_id, precio_unitario')
      .eq('tienda_id', tiendaId)
      .eq('id', detalleVentaId)
      .maybeSingle()

    if (errDet) return { ok: false, error: traducirError(errDet.message) }
    if (!detRaw) return { ok: false, error: 'Línea de venta no encontrada' }

    const det = detRaw as { id: string; variante_id: string | null; precio_unitario: number }
    if (!det.variante_id) {
      return { ok: true, data: [] }
    }

    const { data: varRaw } = await supabase
      .from('variantes_producto')
      .select('producto_id, producto:productos(es_kit, es_bundle)')
      .eq('tienda_id', tiendaId)
      .eq('id', det.variante_id)
      .maybeSingle()

    if (!varRaw) return { ok: true, data: [] }

    const producto = Array.isArray((varRaw as Record<string, unknown>).producto)
      ? ((varRaw as Record<string, unknown>).producto as unknown[])[0]
      : (varRaw as Record<string, unknown>).producto

    if (producto && (Boolean((producto as Record<string, unknown>).es_kit) || Boolean((producto as Record<string, unknown>).es_bundle))) {
      return { ok: true, data: [] }
    }

    const productoId = (varRaw as { producto_id: string }).producto_id
    const opciones = await obtenerVariantesParaCambio(
      productoId,
      Number(det.precio_unitario),
      det.variante_id,
      c
    )

    return { ok: true, data: opciones }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

interface MetodoPagoRow {
  id: string
  nombre: string
  cuenta_fondo_id: string
  cuenta_nombre: string
  cuenta_tipo: string
}

export async function registrarDevolucion(
  input: RegistrarDevolucionInput
): Promise<ActionResult<{ id: string; numero_devolucion: number }>> {
  try {
    if (!input.venta_id) return { ok: false, error: 'Falta el ID de la venta' }
    const motivo = input.motivo?.trim() ?? ''
    if (!motivo) return { ok: false, error: 'El motivo es obligatorio' }
    if (!Array.isArray(input.lineas) || input.lineas.length === 0) {
      return { ok: false, error: 'Seleccioná al menos un ítem para devolver' }
    }
    if (input.tipo_resolucion === 'reembolso') {
      if (!Array.isArray(input.pagos) || input.pagos.length === 0) {
        return { ok: false, error: 'Indicá al menos un método para devolver el dinero' }
      }
    }
    for (const ln of input.lineas) {
      if (!ln.detalle_venta_id) {
        return { ok: false, error: 'Falta referencia a línea de venta' }
      }
      const c = Number(ln.cantidad)
      if (!Number.isFinite(c) || c <= 0 || !Number.isInteger(c)) {
        return { ok: false, error: 'La cantidad a devolver debe ser un entero > 0' }
      }
    }
    for (const p of input.pagos) {
      if (!p.metodo_pago_id) return { ok: false, error: 'Falta método de pago' }
      const m = Number(p.monto)
      if (!Number.isFinite(m) || m <= 0) {
        return { ok: false, error: 'Cada pago debe tener monto > 0' }
      }
    }

    const { supabase, tiendaId, userId, permiteInfinito } = await requireCtx()

    // ---- Cargar venta y validar pertenencia ----
    const { data: ventaRow, error: errVenta } = await supabase
      .from('ventas')
      .select('id, estado, cliente_id')
      .eq('tienda_id', tiendaId)
      .eq('id', input.venta_id)
      .maybeSingle()
    if (errVenta) return { ok: false, error: traducirError(errVenta.message) }
    if (!ventaRow) return { ok: false, error: 'Venta no encontrada' }
    const venta = ventaRow as { id: string; estado: string; cliente_id: string | null }
    if (venta.estado !== 'completada') {
      return { ok: false, error: 'Solo se pueden devolver ventas completadas' }
    }
    const clienteId = input.cliente_id ?? venta.cliente_id
    if (input.tipo_resolucion === 'saldo_a_favor' && !clienteId) {
      return {
        ok: false,
        error:
          'El saldo a favor requiere un cliente. Seleccioná o creá uno y volvé a intentar.',
      }
    }

    // ---- Cargar detalles de la venta (snapshot fuente) ----
    const detalleIds = input.lineas.map((l) => l.detalle_venta_id)
    const { data: detallesRaw, error: errDet } = await supabase
      .from('detalles_venta')
      .select(
        'id, variante_id, nombre_producto, codigo_barras, talla, color, cantidad, precio_unitario'
      )
      .eq('tienda_id', tiendaId)
      .eq('venta_id', input.venta_id)
      .in('id', detalleIds)
    if (errDet) return { ok: false, error: traducirError(errDet.message) }
    if (!detallesRaw || detallesRaw.length !== input.lineas.length) {
      return { ok: false, error: 'Alguna línea seleccionada no pertenece a la venta' }
    }
    const varianteIds = (
      (detallesRaw ?? []) as unknown as Array<Record<string, unknown>>
    )
      .map((d) => d.variante_id as string | null)
      .filter((id): id is string => !!id)

    const metaVariante = new Map<
      string,
      { producto_id: string; es_kit_o_bundle: boolean }
    >()
    if (varianteIds.length > 0) {
      const { data: varsMeta } = await supabase
        .from('variantes_producto')
        .select('id, producto_id, producto:productos(es_kit, es_bundle)')
        .eq('tienda_id', tiendaId)
        .in('id', varianteIds)

      for (const row of (varsMeta ?? []) as unknown as Array<Record<string, unknown>>) {
        const producto = Array.isArray(row.producto)
          ? (row.producto[0] as Record<string, unknown>)
          : (row.producto as Record<string, unknown> | null)
        metaVariante.set(row.id as string, {
          producto_id: row.producto_id as string,
          es_kit_o_bundle: Boolean(producto?.es_kit) || Boolean(producto?.es_bundle),
        })
      }
    }

    const detallesMap = new Map<string, DetalleVentaRow>()
    for (const d of detallesRaw as unknown as Array<Record<string, unknown>>) {
      const varianteId = (d.variante_id as string | null) ?? null
      const meta = varianteId ? metaVariante.get(varianteId) : undefined
      detallesMap.set(d.id as string, {
        id: d.id as string,
        variante_id: varianteId,
        nombre_producto: d.nombre_producto as string,
        codigo_barras: (d.codigo_barras as string | null) ?? null,
        talla: (d.talla as string | null) ?? null,
        color: (d.color as string | null) ?? null,
        cantidad: Number(d.cantidad),
        precio_unitario: Number(d.precio_unitario),
        producto_id: meta?.producto_id ?? null,
        es_kit_o_bundle: meta?.es_kit_o_bundle ?? false,
      })
    }

    // ---- Recalcular saldos ya devueltos contra DB (no confiar en cliente) ----
    const { data: yaDevRaw } = await supabase
      .from('detalles_devolucion')
      .select(
        'detalle_venta_id, cantidad, devolucion:devoluciones!inner(estado, venta_id)'
      )
      .eq('tienda_id', tiendaId)
      .in('detalle_venta_id', detalleIds)

    const yaDevuelto = new Map<string, number>()
    for (const r of (yaDevRaw ?? []) as unknown as Array<Record<string, unknown>>) {
      const dev = Array.isArray(r.devolucion)
        ? (r.devolucion[0] as Record<string, unknown>)
        : (r.devolucion as Record<string, unknown>)
      if (!dev || dev.estado !== 'completada') continue
      if (dev.venta_id !== input.venta_id) continue
      const dvId = r.detalle_venta_id as string
      yaDevuelto.set(dvId, (yaDevuelto.get(dvId) ?? 0) + Number(r.cantidad))
    }

    // ---- Validar cada línea: cantidad ≤ disponible + cambio de variante ----
    let totalDevuelto = 0
    const lineasParaInsertar: LineaInsertPayload[] = []
    const subtipsCambio: SubtipoCambioLinea[] = []

    for (const ln of input.lineas) {
      const det = detallesMap.get(ln.detalle_venta_id)
      if (!det) return { ok: false, error: 'Línea no encontrada' }
      const yaDev = yaDevuelto.get(det.id) ?? 0
      const disponible = det.cantidad - yaDev
      if (ln.cantidad > disponible) {
        return {
          ok: false,
          error: `"${det.nombre_producto}": disponible ${disponible}, intentás devolver ${ln.cantidad}`,
        }
      }
      const totalLinea = round2(det.precio_unitario * ln.cantidad)
      totalDevuelto += totalLinea

      let subtipoCambio: SubtipoCambioLinea | null = null
      let varianteEntregaId: string | null = null
      let nombreEntrega: string | null = null
      let tallaEntrega: string | null = null
      let colorEntrega: string | null = null
      let codigoEntrega: string | null = null

      if (input.tipo_resolucion === 'cambio') {
        const subtipo = ln.subtipo_cambio ?? 'misma_variante'

        if (subtipo === 'otra_variante') {
          if (!ln.variante_entrega_id) {
            return {
              ok: false,
              error: `"${det.nombre_producto}": elegí la variante a entregar`,
            }
          }
          if (!det.variante_id || !det.producto_id) {
            return {
              ok: false,
              error: `"${det.nombre_producto}": no admite cambio de variante`,
            }
          }
          if (det.es_kit_o_bundle) {
            return {
              ok: false,
              error: `"${det.nombre_producto}": kits/bundles solo permiten misma variante`,
            }
          }

          const entrega = await obtenerVarianteEntregaParaValidacion(
            ln.variante_entrega_id,
            tiendaId
          )
          if (!entrega) {
            return { ok: false, error: 'Variante de entrega no encontrada' }
          }
          if (entrega.producto_id !== det.producto_id) {
            return {
              ok: false,
              error: `"${det.nombre_producto}": la variante entregada debe ser del mismo producto`,
            }
          }
          if (!preciosCoinciden(entrega.precio_venta, det.precio_unitario)) {
            return {
              ok: false,
              error: `"${det.nombre_producto}": la variante entregada tiene otro precio. Cobrá la diferencia en el POS.`,
            }
          }
          if (!entrega.activo) {
            return { ok: false, error: 'La variante a entregar está inactiva' }
          }
          if (!tieneStockSuficiente(entrega.stock_actual, ln.cantidad, permiteInfinito)) {
            return {
              ok: false,
              error: `"${det.nombre_producto}": stock insuficiente en la variante seleccionada`,
            }
          }
          if (entrega.variante_entrega_id === det.variante_id) {
            return {
              ok: false,
              error: `"${det.nombre_producto}": elegí una variante distinta o usá "Misma variante"`,
            }
          }

          subtipoCambio = 'otra_variante'
          varianteEntregaId = entrega.variante_entrega_id
          nombreEntrega = entrega.nombre_producto_entrega
          tallaEntrega = entrega.talla_entrega
          colorEntrega = entrega.color_entrega
          codigoEntrega = entrega.codigo_barras_entrega
        } else {
          subtipoCambio = 'misma_variante'
          if (det.variante_id) {
            varianteEntregaId = det.variante_id
          }
        }

        subtipsCambio.push(subtipoCambio)
      }

      lineasParaInsertar.push({
        detalle: det,
        cantidad: ln.cantidad,
        total_linea: totalLinea,
        subtipo_cambio: subtipoCambio,
        variante_entrega_id: varianteEntregaId,
        nombre_producto_entrega: nombreEntrega,
        talla_entrega: tallaEntrega,
        color_entrega: colorEntrega,
        codigo_barras_entrega: codigoEntrega,
      })
    }
    totalDevuelto = round2(totalDevuelto)

    const subtipoCambioCabecera =
      input.tipo_resolucion === 'cambio'
        ? calcularSubtipoCambioCabecera(subtipsCambio)
        : null

    // ---- Sesión de caja abierta (si existe): asociar la devolución al turno.
    // Trazabilidad para el cierre — aplica a reembolso, saldo a favor y cambio.
    const { data: sesionAbierta } = await supabase
      .from('sesiones_caja')
      .select('id')
      .eq('tienda_id', tiendaId)
      .eq('estado', 'abierta')
      .maybeSingle()
    const sesionId: string | null = sesionAbierta
      ? (sesionAbierta as { id: string }).id
      : null

    // ---- Cargar métodos de pago para snapshots (solo reembolso) ----
    const metodos = new Map<string, MetodoPagoRow>()
    if (input.tipo_resolucion === 'reembolso') {
      const metodoIds = Array.from(new Set(input.pagos.map((p) => p.metodo_pago_id)))
      const { data: metodosRaw, error: errMet } = await supabase
        .from('metodos_pago')
        .select(
          'id, nombre, cuenta_fondo_id, activo, cuenta:cuentas_fondos!inner(nombre, tipo, activo)'
        )
        .eq('tienda_id', tiendaId)
        .in('id', metodoIds)
      if (errMet) return { ok: false, error: traducirError(errMet.message) }
      for (const m of (metodosRaw ?? []) as unknown as Array<Record<string, unknown>>) {
        if (m.activo === false) continue
        const cuenta = Array.isArray(m.cuenta)
          ? (m.cuenta[0] as Record<string, unknown>)
          : (m.cuenta as Record<string, unknown>)
        if (!cuenta || cuenta.activo === false) continue
        metodos.set(m.id as string, {
          id: m.id as string,
          nombre: m.nombre as string,
          cuenta_fondo_id: m.cuenta_fondo_id as string,
          cuenta_nombre: (cuenta.nombre as string) ?? 'Cuenta',
          cuenta_tipo: (cuenta.tipo as string) ?? 'efectivo',
        })
      }
      for (const p of input.pagos) {
        if (!metodos.has(p.metodo_pago_id)) {
          return { ok: false, error: 'Método de pago inválido o inactivo' }
        }
      }

      // ---- Validar suma de pagos == total devuelto ----
      const sumaPagos = round2(input.pagos.reduce((acc, p) => acc + Number(p.monto), 0))
      if (Math.abs(sumaPagos - totalDevuelto) > 0.01) {
        return {
          ok: false,
          error: `El total a devolver ($${totalDevuelto}) no coincide con los pagos ($${sumaPagos})`,
        }
      }

      // ---- Para pagos en efectivo la caja abierta es obligatoria,
      // porque el efectivo sale físicamente del cajón.
      const hayEfectivo = input.pagos.some(
        (p) => metodos.get(p.metodo_pago_id)?.cuenta_tipo === 'efectivo'
      )
      if (!sesionId && hayEfectivo) {
        return {
          ok: false,
          error:
            'Para devolver efectivo necesitás una sesión de caja abierta. Abrí caja o devolvé por otro método.',
        }
      }
    }

    // ---- Determinar tipo: si suma ya devuelta + esta == total vendido → 'total' ----
    // Cargar TODAS las líneas de la venta para comparar
    const { data: todasLineasRaw } = await supabase
      .from('detalles_venta')
      .select('id, cantidad')
      .eq('tienda_id', tiendaId)
      .eq('venta_id', input.venta_id)
    const totalUnidadesVendidas = (
      (todasLineasRaw ?? []) as Array<{ cantidad: number }>
    ).reduce((acc, d) => acc + Number(d.cantidad), 0)

    // Sumar lo ya devuelto de TODAS las líneas (no solo las seleccionadas)
    const { data: todoDevRaw } = await supabase
      .from('detalles_devolucion')
      .select(
        'cantidad, detalle_venta_id, devolucion:devoluciones!inner(estado, venta_id)'
      )
      .eq('tienda_id', tiendaId)
    let totalDevPrevio = 0
    for (const r of (todoDevRaw ?? []) as unknown as Array<Record<string, unknown>>) {
      const dev = Array.isArray(r.devolucion)
        ? (r.devolucion[0] as Record<string, unknown>)
        : (r.devolucion as Record<string, unknown>)
      if (!dev || dev.estado !== 'completada') continue
      if (dev.venta_id !== input.venta_id) continue
      totalDevPrevio += Number(r.cantidad)
    }
    const totalDevAhora = lineasParaInsertar.reduce((acc, l) => acc + l.cantidad, 0)
    const tipo: 'total' | 'parcial' =
      totalDevPrevio + totalDevAhora >= totalUnidadesVendidas ? 'total' : 'parcial'

    // ---- Obtener número atómico ----
    const { data: numDev, error: errNum } = await supabase.rpc(
      'get_siguiente_numero_devolucion',
      { p_tienda_id: tiendaId }
    )
    if (errNum || numDev == null) {
      return {
        ok: false,
        error: traducirError(errNum?.message ?? 'No se pudo obtener número de devolución'),
      }
    }
    const numeroDevolucion = Number(numDev)

    // ---- INSERT cabecera ----
    const { data: devIns, error: errIns } = await supabase
      .from('devoluciones')
      .insert({
        tienda_id: tiendaId,
        venta_id: input.venta_id,
        sesion_caja_id: sesionId,
        usuario_id: userId,
        cliente_id: clienteId,
        numero_devolucion: numeroDevolucion,
        tipo,
        motivo,
        estado: 'completada',
        total_devuelto: totalDevuelto,
        tipo_resolucion: input.tipo_resolucion,
        subtipo_cambio: subtipoCambioCabecera,
      })
      .select('id')
      .maybeSingle()
    if (errIns || !devIns) {
      return { ok: false, error: traducirError(errIns?.message) }
    }
    const devolucionId = (devIns as { id: string }).id

    // ---- INSERT detalles (trigger repone stock) ----
    for (const ln of lineasParaInsertar) {
      const { error: errLn } = await supabase.from('detalles_devolucion').insert({
        tienda_id: tiendaId,
        devolucion_id: devolucionId,
        detalle_venta_id: ln.detalle.id,
        variante_id: ln.detalle.variante_id,
        nombre_producto: ln.detalle.nombre_producto,
        codigo_barras: ln.detalle.codigo_barras,
        talla: ln.detalle.talla,
        color: ln.detalle.color,
        cantidad: ln.cantidad,
        precio_unitario: ln.detalle.precio_unitario,
        total_linea: ln.total_linea,
        subtipo_cambio: ln.subtipo_cambio,
        variante_entrega_id: ln.variante_entrega_id,
        nombre_producto_entrega: ln.nombre_producto_entrega,
        talla_entrega: ln.talla_entrega,
        color_entrega: ln.color_entrega,
        codigo_barras_entrega: ln.codigo_barras_entrega,
      })
      if (errLn) {
        return {
          ok: false,
          error: `Devolución creada pero falló una línea: ${traducirError(errLn.message)}`,
        }
      }
    }

    // ---- Dinero: reembolso, saldo a favor o cambio ----
    if (input.tipo_resolucion === 'reembolso') {
      for (const p of input.pagos) {
        const m = metodos.get(p.metodo_pago_id)!
        const monto = round2(Number(p.monto))
        const { error: errPago } = await supabase.from('pagos_devolucion').insert({
          tienda_id: tiendaId,
          devolucion_id: devolucionId,
          metodo_pago_id: m.id,
          cuenta_fondo_id: m.cuenta_fondo_id,
          nombre_metodo: m.nombre,
          nombre_cuenta: m.cuenta_nombre,
          monto,
          referencia: p.referencia?.trim() || null,
        })
        if (errPago) {
          return {
            ok: false,
            error: `Devolución creada pero falló un pago: ${traducirError(errPago.message)}`,
          }
        }
      }
    } else if (input.tipo_resolucion === 'saldo_a_favor' && clienteId) {
      // Acreditar saldo_favor al cliente
      const { error: errSaldo } = await supabase.rpc('incrementar_saldo_favor', {
        p_cliente_id: clienteId,
        p_tienda_id: tiendaId,
        p_monto: totalDevuelto,
      })
      if (errSaldo) {
        return {
          ok: false,
          error: `Devolución creada pero falló al acreditar saldo: ${traducirError(errSaldo.message)}`,
        }
      }
    }
    // tipo 'cambio': solo repone stock, sin movimiento de dinero

    revalidatePath('/devoluciones')
    revalidatePath(`/devoluciones/${devolucionId}`)
    revalidatePath('/ventas')
    revalidatePath(`/ventas/${input.venta_id}`)
    revalidatePath('/stock')
    revalidatePath('/caja')
    if (clienteId) {
      revalidatePath(`/clientes/${clienteId}`)
    }

    return { ok: true, data: { id: devolucionId, numero_devolucion: numeroDevolucion } }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}
