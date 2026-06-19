'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { enviarEmailCierre } from '@/lib/email/enviar-cierre'

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
  }
}

function traducirError(msg?: string | null): string {
  if (!msg) return 'Error desconocido'
  if (msg.includes('sesiones_caja_unica_abierta_idx'))
    return 'Ya hay una sesión de caja abierta'
  if (msg.includes('row-level security')) return 'No tenés permisos para esta operación'
  if (msg.includes('Sesión de caja no encontrada')) return 'La sesión ya fue cerrada o no existe'
  return msg
}

export interface AbrirSesionInput {
  monto_apertura_efectivo: number
  observaciones?: string | null
}

export async function abrirSesion(input: AbrirSesionInput): Promise<ActionResult<{ id: string }>> {
  try {
    const monto = Number(input.monto_apertura_efectivo)
    if (!Number.isFinite(monto) || monto < 0) {
      return { ok: false, error: 'El monto de apertura debe ser un número ≥ 0' }
    }

    const { supabase, tiendaId, userId } = await requireCtx()

    // Verificar que no haya sesión abierta (mensaje claro antes de chocar con el UNIQUE INDEX)
    const { data: existente } = await supabase
      .from('sesiones_caja')
      .select('id')
      .eq('tienda_id', tiendaId)
      .eq('estado', 'abierta')
      .maybeSingle()

    if (existente) {
      return { ok: false, error: 'Ya hay una sesión de caja abierta' }
    }

    const { data, error } = await supabase
      .from('sesiones_caja')
      .insert({
        tienda_id: tiendaId,
        usuario_apertura_id: userId,
        monto_apertura_efectivo: monto,
        observaciones_apertura: input.observaciones?.trim() || null,
        estado: 'abierta',
      })
      .select('id')
      .maybeSingle()

    if (error) return { ok: false, error: traducirError(error.message) }

    revalidatePath('/caja')
    revalidatePath('/dashboard')
    revalidatePath('/pos')
    revalidatePath('/', 'layout')
    return { ok: true, data: { id: (data as { id: string }).id } }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export interface CerrarSesionInput {
  sesion_id: string
  efectivo_declarado?: number | null
  observaciones?: string | null
}

export async function cerrarSesion(
  input: CerrarSesionInput
): Promise<ActionResult<{ cierreId: string }>> {
  try {
    if (!input.sesion_id) return { ok: false, error: 'Falta el id de la sesión' }
    if (
      input.efectivo_declarado != null &&
      (!Number.isFinite(Number(input.efectivo_declarado)) ||
        Number(input.efectivo_declarado) < 0)
    ) {
      return { ok: false, error: 'Efectivo declarado inválido' }
    }

    const { supabase, tiendaId } = await requireCtx()

    const { data, error } = await supabase.rpc('cerrar_caja', {
      p_sesion_id: input.sesion_id,
      p_efectivo_declarado:
        input.efectivo_declarado != null ? Number(input.efectivo_declarado) : null,
      p_observaciones: input.observaciones?.trim() || null,
    })

    if (error) return { ok: false, error: traducirError(error.message) }

    revalidatePath('/caja')
    revalidatePath('/dashboard')
    revalidatePath('/pos')
    revalidatePath('/ventas')
    revalidatePath('/', 'layout')

    // Email de cierre — awaited con catch para no bloquear ni revertir
    await enviarEmailCierre(input.sesion_id, data as string, tiendaId).catch((err) =>
      console.error('[caja] email cierre fallido:', err)
    )

    return { ok: true, data: { cierreId: data as string } }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export async function cerrarSesionEmergencia(
  sesion_id: string
): Promise<ActionResult<{ cierreId: string }>> {
  try {
    if (!sesion_id) return { ok: false, error: 'Falta el id de la sesión' }

    const { supabase, tiendaId } = await requireCtx()

    const { data, error } = await supabase.rpc('cerrar_caja', {
      p_sesion_id: sesion_id,
      p_efectivo_declarado: null,
      p_observaciones: 'Cierre de emergencia — sin arqueo',
    })

    if (error) return { ok: false, error: traducirError(error.message) }

    // Marcar el cierre como emergencia
    await supabase
      .from('cierres_caja')
      .update({ tipo_cierre: 'emergencia' })
      .eq('id', data as string)

    revalidatePath('/caja')
    revalidatePath('/dashboard')
    revalidatePath('/pos')
    revalidatePath('/', 'layout')

    // Email de cierre — awaited con catch para no bloquear ni revertir
    await enviarEmailCierre(sesion_id, data as string, tiendaId).catch((err) =>
      console.error('[caja] email cierre emergencia fallido:', err)
    )

    return { ok: true, data: { cierreId: data as string } }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export async function reabrirCaja(
  sesion_id: string
): Promise<ActionResult<void>> {
  try {
    if (!sesion_id) return { ok: false, error: 'Falta el id de la sesión' }
    const { supabase, tiendaId } = await requireCtx()

    // Solo se puede reabrir si NO hay otra sesión abierta
    const { data: abierta } = await supabase
      .from('sesiones_caja')
      .select('id')
      .eq('tienda_id', tiendaId)
      .eq('estado', 'abierta')
      .maybeSingle()
    if (abierta) {
      return { ok: false, error: 'Ya hay una sesión abierta. Cerrala antes de reabrir otra.' }
    }

    // Verificar que la sesión pertenece a la tienda
    const { data: sesion } = await supabase
      .from('sesiones_caja')
      .select('id, estado')
      .eq('tienda_id', tiendaId)
      .eq('id', sesion_id)
      .maybeSingle()
    if (!sesion) return { ok: false, error: 'Sesión no encontrada' }
    if ((sesion as { estado: string }).estado !== 'cerrada') {
      return { ok: false, error: 'La sesión no está cerrada' }
    }

    // Eliminar el cierre asociado
    await supabase
      .from('cierres_caja')
      .delete()
      .eq('sesion_id', sesion_id)
      .eq('tienda_id', tiendaId)

    // Reabrir la sesión
    const { error: errUpdate } = await supabase
      .from('sesiones_caja')
      .update({ estado: 'abierta', fecha_cierre: null, observaciones_cierre: null })
      .eq('id', sesion_id)
      .eq('tienda_id', tiendaId)

    if (errUpdate) return { ok: false, error: traducirError(errUpdate.message) }

    revalidatePath('/caja')
    revalidatePath('/dashboard')
    revalidatePath(`/caja/sesiones/${sesion_id}`)
    revalidatePath('/pos')
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export interface RegistrarMovimientoInput {
  cuenta_fondo_id: string
  tipo: 'ingreso' | 'egreso'
  concepto: string
  monto: number
}

export async function registrarMovimientoCaja(
  input: RegistrarMovimientoInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const monto = Number(input.monto)
    if (!Number.isFinite(monto) || monto <= 0) {
      return { ok: false, error: 'El monto debe ser mayor a 0' }
    }
    if (!input.concepto?.trim()) {
      return { ok: false, error: 'El concepto no puede estar vacío' }
    }
    if (!input.cuenta_fondo_id) {
      return { ok: false, error: 'Seleccioná una cuenta' }
    }

    const { supabase, tiendaId, userId } = await requireCtx()

    // Leer cuenta para verificar que pertenece a la tienda y obtener saldo actual
    const { data: cuentaRaw, error: errCuenta } = await supabase
      .from('cuentas_fondos')
      .select('id, nombre, saldo_actual')
      .eq('tienda_id', tiendaId)
      .eq('id', input.cuenta_fondo_id)
      .eq('activo', true)
      .maybeSingle()

    if (errCuenta || !cuentaRaw) {
      return { ok: false, error: 'La cuenta seleccionada no existe' }
    }

    const cuenta = cuentaRaw as { id: string; nombre: string; saldo_actual: number }
    const saldoAnterior = Number(cuenta.saldo_actual ?? 0)
    const saldoPosterior =
      input.tipo === 'ingreso' ? saldoAnterior + monto : saldoAnterior - monto

    if (saldoPosterior < 0) {
      return {
        ok: false,
        error: `Saldo insuficiente en "${cuenta.nombre}" para este egreso`,
      }
    }

    // Insertar movimiento
    const { data: mov, error: errMov } = await supabase
      .from('movimientos_fondos')
      .insert({
        tienda_id: tiendaId,
        cuenta_fondo_id: input.cuenta_fondo_id,
        tipo: input.tipo,
        concepto: input.concepto.trim(),
        monto,
        saldo_anterior: saldoAnterior,
        saldo_posterior: saldoPosterior,
        venta_id: null,
        usuario_id: userId,
      })
      .select('id')
      .maybeSingle()

    if (errMov || !mov) {
      return { ok: false, error: traducirError(errMov?.message) }
    }

    // Actualizar saldo de la cuenta
    const { error: errUpdate } = await supabase
      .from('cuentas_fondos')
      .update({ saldo_actual: saldoPosterior })
      .eq('id', input.cuenta_fondo_id)
      .eq('tienda_id', tiendaId)

    if (errUpdate) {
      return { ok: false, error: traducirError(errUpdate.message) }
    }

    revalidatePath('/caja')
    revalidatePath('/dashboard')
    revalidatePath('/pos')
    revalidatePath('/', 'layout')
    return { ok: true, data: { id: (mov as { id: string }).id } }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}
