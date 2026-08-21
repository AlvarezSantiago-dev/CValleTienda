'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { reconciliarSaldoCcCliente } from '@/lib/cc/sync-cargos'
import type { EstadoRemito, TipoRemito } from '@/types/database'

async function getCtx() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) redirect('/login')
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!perfil) redirect('/login')
  return { supabase, tiendaId: perfil.tienda_id as string, userId: auth.user.id }
}

async function vincularCargoVentaAlRemito(
  supabase: Awaited<ReturnType<typeof getCtx>>['supabase'],
  opts: { tiendaId: string; ventaId: string; remitoId: string }
) {
  await supabase
    .from('movimientos_cc')
    .update({ remito_id: opts.remitoId })
    .eq('tienda_id', opts.tiendaId)
    .eq('venta_id', opts.ventaId)
    .eq('tipo', 'cargo')
    .is('remito_id', null)
}

export interface RemitoItemInput {
  nombre_producto: string
  talla:           string | null
  color:           string | null
  cantidad:        number
  precio_unitario: number
}

export interface CrearRemitoInput {
  venta_id:          string | null
  cliente_id:        string | null
  tipo:              TipoRemito
  destinatario:      string
  direccion_entrega: string
  telefono_entrega:  string
  observaciones:     string
  fecha_entrega:     string
  monto_total:       number
  items:             RemitoItemInput[]
}

export async function crearRemito(input: CrearRemitoInput) {
  if (!input.destinatario.trim()) {
    return { error: 'El campo destinatario es obligatorio.' }
  }

  const { supabase, userId } = await getCtx()

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id')
    .eq('id', userId)
    .maybeSingle()

  if (!perfil) return { error: 'No se encontró el perfil.' }
  const tiendaId = perfil.tienda_id as string

  // Número correlativo
  const { data: maxRow } = await supabase
    .from('remitos')
    .select('numero_remito')
    .eq('tienda_id', tiendaId)
    .order('numero_remito', { ascending: false })
    .limit(1)
    .maybeSingle()

  const numero = ((maxRow as { numero_remito: number } | null)?.numero_remito ?? 0) + 1

  // Calcular monto_total desde detalles_venta si hay venta asociada
  let montoTotal = input.monto_total
  if (input.venta_id) {
    const { data: detalles } = await supabase
      .from('detalles_venta')
      .select('total_linea')
      .eq('venta_id', input.venta_id)
    if (detalles && detalles.length > 0) {
      montoTotal = (detalles as { total_linea: number }[]).reduce((a, d) => a + Number(d.total_linea), 0)
    }
  }

  // Estado cobro según tipo
  const estadoCobro = input.tipo === 'cuenta_corriente' ? 'pendiente' : 'no_aplica'

  const { data: remito, error: errInsert } = await supabase
    .from('remitos')
    .insert({
      tienda_id:         tiendaId,
      venta_id:          input.venta_id  || null,
      cliente_id:        input.cliente_id || null,
      usuario_id:        userId,
      numero_remito:     numero as number,
      tipo:              input.tipo,
      destinatario:      input.destinatario.trim(),
      direccion_entrega: input.direccion_entrega.trim() || null,
      telefono_entrega:  input.telefono_entrega.trim()  || null,
      observaciones:     input.observaciones.trim()     || null,
      fecha_entrega:     input.fecha_entrega             || null,
      estado:            'borrador',
      monto_total:       montoTotal,
      monto_cobrado:     0,
      estado_cobro:      estadoCobro,
    })
    .select('id')
    .single()

  if (errInsert || !remito) {
    return { error: 'Error al crear el remito.' }
  }

  const remitoId = (remito as { id: string }).id

  // Insertar items propios si no hay venta_id y hay items
  if (!input.venta_id && input.items.length > 0) {
    const itemsInsert = input.items
      .filter((it) => it.nombre_producto.trim() && it.cantidad > 0)
      .map((it) => ({
        remito_id:       remitoId,
        tienda_id:       tiendaId,
        nombre_producto: it.nombre_producto.trim(),
        talla:           it.talla?.trim() || null,
        color:           it.color?.trim() || null,
        cantidad:        it.cantidad,
        precio_unitario: it.precio_unitario,
        total_linea:     it.cantidad * it.precio_unitario,
      }))
    if (itemsInsert.length > 0) {
      await supabase.from('remito_items').insert(itemsInsert)
    }
  }

  if (input.tipo === 'cuenta_corriente' && input.cliente_id && montoTotal > 0.01) {
    let yaTieneCargo = false
    if (input.venta_id) {
      const { data: ventaCc } = await supabase
        .from('ventas')
        .select('monto_cc')
        .eq('id', input.venta_id)
        .eq('tienda_id', tiendaId)
        .maybeSingle()
      yaTieneCargo = Number((ventaCc as { monto_cc?: number } | null)?.monto_cc ?? 0) > 0.01
    }
    if (!yaTieneCargo) {
      const { error: errCargo } = await supabase.rpc('registrar_movimiento_cc', {
        p_tienda_id: tiendaId,
        p_cliente_id: input.cliente_id,
        p_tipo: 'cargo',
        p_monto: montoTotal,
        p_concepto: `Remito #${numero}`,
        p_venta_id: input.venta_id || null,
        p_remito_id: remitoId,
        p_usuario_id: userId,
      })
      if (errCargo) {
        return { error: `Remito creado pero no se pudo cargar la deuda: ${errCargo.message}` }
      }
      revalidatePath('/clientes')
      revalidatePath(`/clientes/${input.cliente_id}`)
      revalidatePath('/dashboard')
    } else if (input.venta_id) {
      await vincularCargoVentaAlRemito(supabase, {
        tiendaId,
        ventaId: input.venta_id,
        remitoId,
      })
    }
  }

  revalidatePath('/remitos')
  return { remitoId }
}

/** Remito automático post-venta (estado emitido + snapshot de ítems). */
export async function crearRemitoDesdeVenta(input: {
  ventaId: string
  clienteId: string | null
  tipo: TipoRemito
  destinatario: string
  montoTotal: number
  montoCobrado?: number
  observaciones?: string
  direccion_entrega?: string | null
  telefono_entrega?: string | null
  items: RemitoItemInput[]
}): Promise<{ remitoId?: string; error?: string }> {
  const { supabase, userId, tiendaId } = await getCtx()

  const { data: maxRow } = await supabase
    .from('remitos')
    .select('numero_remito')
    .eq('tienda_id', tiendaId)
    .order('numero_remito', { ascending: false })
    .limit(1)
    .maybeSingle()

  const numero = ((maxRow as { numero_remito: number } | null)?.numero_remito ?? 0) + 1
  const montoCobrado = Math.max(0, Number(input.montoCobrado ?? 0))
  const estadoCobro =
    input.tipo === 'cuenta_corriente'
      ? montoCobrado + 0.01 >= input.montoTotal
        ? 'cobrado'
        : 'pendiente'
      : 'no_aplica'

  const { data: remito, error: errInsert } = await supabase
    .from('remitos')
    .insert({
      tienda_id: tiendaId,
      venta_id: input.ventaId,
      cliente_id: input.clienteId,
      usuario_id: userId,
      numero_remito: numero,
      tipo: input.tipo,
      destinatario: input.destinatario.trim() || 'Cliente',
      direccion_entrega: input.direccion_entrega?.trim() || null,
      telefono_entrega: input.telefono_entrega?.trim() || null,
      observaciones: input.observaciones?.trim() || null,
      estado: 'emitido',
      monto_total: input.montoTotal,
      monto_cobrado: montoCobrado,
      estado_cobro: estadoCobro,
    })
    .select('id')
    .single()

  if (errInsert || !remito) {
    return { error: errInsert?.message ?? 'Error al crear el remito automático.' }
  }

  const remitoId = (remito as { id: string }).id
  const itemsInsert = input.items
    .filter((it) => it.nombre_producto.trim() && it.cantidad > 0)
    .map((it) => ({
      remito_id: remitoId,
      tienda_id: tiendaId,
      nombre_producto: it.nombre_producto.trim(),
      talla: it.talla?.trim() || null,
      color: it.color?.trim() || null,
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario,
      total_linea: it.cantidad * it.precio_unitario,
    }))
  if (itemsInsert.length > 0) {
    await supabase.from('remito_items').insert(itemsInsert)
  }

  await vincularCargoVentaAlRemito(supabase, {
    tiendaId,
    ventaId: input.ventaId,
    remitoId,
  })

  revalidatePath('/remitos')
  revalidatePath(`/remitos/${remitoId}`)
  return { remitoId }
}

export async function actualizarEstadoRemito(id: string, estado: EstadoRemito) {
  const { supabase } = await getCtx()

  const { error } = await supabase
    .from('remitos')
    .update({ estado })
    .eq('id', id)

  if (error) {
    return { error: 'No se pudo actualizar el estado.' }
  }

  revalidatePath(`/remitos/${id}`)
  revalidatePath('/remitos')
  return { ok: true }
}

export async function registrarCobroRemito(
  id: string,
  montoCobrado: number,
  fechaCobro: string,
  metodoPagoId?: string | null
): Promise<{ ok: boolean; error?: string; movimientoId?: string }> {
  if (montoCobrado <= 0) {
    return { ok: false, error: 'El monto debe ser mayor a cero.' }
  }

  const { supabase, userId, tiendaId } = await getCtx()

  const { data: remito } = await supabase
    .from('remitos')
    .select('monto_total, monto_cobrado, cliente_id, tipo, numero_remito')
    .eq('id', id)
    .maybeSingle()

  if (!remito) return { ok: false, error: 'Remito no encontrado.' }

  const row = remito as {
    monto_total: number
    monto_cobrado: number
    cliente_id: string | null
    tipo: string
    numero_remito: number
  }
  const total = Number(row.monto_total)
  const prevCobrado = Number(row.monto_cobrado ?? 0)
  const pendiente = Math.max(0, Math.round((total - prevCobrado) * 100) / 100)
  if (montoCobrado - 0.01 > pendiente) {
    return { ok: false, error: `El cobro supera el pendiente ($${pendiente})` }
  }
  const nuevoMontoCobrado = prevCobrado + montoCobrado
  const estadoCobro = nuevoMontoCobrado >= total ? 'cobrado' : 'pendiente'

  let metodoNombre = ''
  let cuentaFondoId: string | null = null
  if (metodoPagoId) {
    const { data: metodo } = await supabase
      .from('metodos_pago')
      .select('id, nombre, cuenta_fondo_id, activo')
      .eq('id', metodoPagoId)
      .eq('tienda_id', tiendaId)
      .maybeSingle()

    const m = metodo as {
      id: string
      nombre: string
      cuenta_fondo_id: string
      activo: boolean
    } | null
    if (!m || !m.activo) {
      return { ok: false, error: 'Método de pago inválido o inactivo.' }
    }
    metodoNombre = m.nombre
    cuentaFondoId = m.cuenta_fondo_id
  }

  if (cuentaFondoId) {
    const { data: sesion } = await supabase
      .from('sesiones_caja')
      .select('id')
      .eq('tienda_id', tiendaId)
      .eq('estado', 'abierta')
      .maybeSingle()

    if (sesion) {
      const { error: errFondo } = await supabase.rpc('registrar_movimiento_fondo', {
        p_cuenta_fondo_id: cuentaFondoId,
        p_tipo: 'ingreso',
        p_concepto: `Cobro remito #${row.numero_remito}${metodoNombre ? ` (${metodoNombre})` : ''}`,
        p_monto: montoCobrado,
        p_venta_id: null,
        p_usuario_id: userId,
      })
      if (errFondo) return { ok: false, error: errFondo.message }
    }
  }

  let movimientoId: string | undefined
  if (row.tipo === 'cuenta_corriente' && row.cliente_id) {
    const sync = await reconciliarSaldoCcCliente(supabase, {
      tiendaId,
      userId,
      clienteId: row.cliente_id,
    })
    if (sync.error) return { ok: false, error: sync.error }

    const { error: errCc } = await supabase.rpc('registrar_movimiento_cc', {
      p_tienda_id: tiendaId,
      p_cliente_id: row.cliente_id,
      p_tipo: 'pago',
      p_monto: montoCobrado,
      p_concepto: `Cobro remito #${row.numero_remito}`,
      p_venta_id: null,
      p_remito_id: id,
      p_usuario_id: userId,
    })
    if (errCc) return { ok: false, error: errCc.message }

    const { data: mov } = await supabase
      .from('movimientos_cc')
      .select('id')
      .eq('tienda_id', tiendaId)
      .eq('cliente_id', row.cliente_id)
      .eq('tipo', 'pago')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    movimientoId = (mov as { id: string } | null)?.id
    if (movimientoId && metodoNombre) {
      await supabase
        .from('movimientos_cc')
        .update({ medio_pago: metodoNombre })
        .eq('id', movimientoId)
        .eq('tienda_id', tiendaId)
    }
  }

  const { error } = await supabase
    .from('remitos')
    .update({
      monto_cobrado: nuevoMontoCobrado,
      estado_cobro: estadoCobro,
      fecha_cobro: fechaCobro || null,
    })
    .eq('id', id)

  if (error) return { ok: false, error: 'Error al registrar el cobro.' }

  revalidatePath(`/remitos/${id}`)
  revalidatePath('/remitos')
  revalidatePath('/clientes')
  if (row.cliente_id) revalidatePath(`/clientes/${row.cliente_id}`)
  revalidatePath('/dashboard')
  revalidatePath('/caja')
  return { ok: true, movimientoId }
}
