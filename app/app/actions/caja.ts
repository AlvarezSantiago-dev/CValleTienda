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
    rol: perfil.rol as string,
  }
}

function traducirError(msg?: string | null): string {
  if (!msg) return 'Error desconocido'
  if (msg.includes('sesiones_caja_unica_abierta_idx'))
    return 'Ya hay una sesión de caja abierta'
  if (msg.includes('row-level security')) return 'No tenés permisos para esta operación'
  if (msg.includes('Sin permiso para modificar movimientos'))
    return 'Solo el dueño o un administrador pueden editar o eliminar movimientos'
  if (msg.includes('Sesión de caja no encontrada')) return 'La sesión ya fue cerrada o no existe'
  if (msg.includes('La caja debe estar abierta')) return 'La caja debe estar abierta'
  if (msg.includes('Solo se pueden editar movimientos manuales'))
    return 'Solo se pueden editar movimientos manuales'
  if (msg.includes('Solo se pueden eliminar movimientos manuales'))
    return 'Solo se pueden eliminar movimientos manuales'
  if (msg.includes('no pertenece al turno')) return 'El movimiento no pertenece al turno abierto'
  if (msg.includes('Saldo al momento insuficiente'))
    return 'Saldo al momento insuficiente para este egreso'
  if (msg.includes('Saldo insuficiente')) return 'Saldo insuficiente para este egreso'
  if (msg.includes('cuenta seleccionada no existe') || msg.includes('cuenta original no existe'))
    return 'La cuenta seleccionada no existe'
  if (msg.includes('Movimiento no encontrado')) return 'Movimiento no encontrado'
  if (msg.includes('dejaría saldo negativo'))
    return 'No se puede eliminar: dejaría saldo negativo en la cuenta'
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

function revalidateCajaPaths() {
  revalidatePath('/caja')
  revalidatePath('/dashboard')
  revalidatePath('/pos')
  revalidatePath('/', 'layout')
}

/** Alta de ingreso/egreso manual. Permitido a owner, admin y vendedor (cajero). */
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
    if (input.tipo !== 'ingreso' && input.tipo !== 'egreso') {
      return { ok: false, error: 'Tipo inválido' }
    }

    const { supabase } = await requireCtx()

    const { data, error } = await supabase.rpc('registrar_movimiento_caja_manual', {
      p_cuenta_fondo_id: input.cuenta_fondo_id,
      p_tipo: input.tipo,
      p_concepto: input.concepto.trim(),
      p_monto: monto,
    })

    if (error) return { ok: false, error: traducirError(error.message) }

    revalidateCajaPaths()
    return { ok: true, data: { id: data as string } }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export interface EditarMovimientoInput {
  id: string
  cuenta_fondo_id: string
  tipo: 'ingreso' | 'egreso'
  concepto: string
  monto: number
}

export async function editarMovimientoCaja(
  input: EditarMovimientoInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const monto = Number(input.monto)
    if (!input.id) return { ok: false, error: 'Falta el id del movimiento' }
    if (!Number.isFinite(monto) || monto <= 0) {
      return { ok: false, error: 'El monto debe ser mayor a 0' }
    }
    if (!input.concepto?.trim()) {
      return { ok: false, error: 'El concepto no puede estar vacío' }
    }
    if (!input.cuenta_fondo_id) {
      return { ok: false, error: 'Seleccioná una cuenta' }
    }
    if (input.tipo !== 'ingreso' && input.tipo !== 'egreso') {
      return { ok: false, error: 'Tipo inválido' }
    }

    const { supabase, rol } = await requireCtx()
    if (rol !== 'owner' && rol !== 'admin') {
      return {
        ok: false,
        error: 'Solo el dueño o un administrador pueden editar o eliminar movimientos',
      }
    }

    const { data, error } = await supabase.rpc('editar_movimiento_caja_manual', {
      p_id: input.id,
      p_cuenta_fondo_id: input.cuenta_fondo_id,
      p_tipo: input.tipo,
      p_concepto: input.concepto.trim(),
      p_monto: monto,
    })

    if (error) return { ok: false, error: traducirError(error.message) }

    revalidateCajaPaths()
    return { ok: true, data: { id: (data as string) ?? input.id } }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export async function eliminarMovimientoCaja(id: string): Promise<ActionResult> {
  try {
    if (!id) return { ok: false, error: 'Falta el id del movimiento' }

    const { supabase, rol } = await requireCtx()
    if (rol !== 'owner' && rol !== 'admin') {
      return {
        ok: false,
        error: 'Solo el dueño o un administrador pueden editar o eliminar movimientos',
      }
    }

    const { error } = await supabase.rpc('eliminar_movimiento_caja_manual', {
      p_id: id,
    })

    if (error) return { ok: false, error: traducirError(error.message) }

    revalidateCajaPaths()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}
