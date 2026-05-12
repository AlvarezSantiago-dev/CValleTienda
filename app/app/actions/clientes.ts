'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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
  if (msg.includes('row-level security') || msg.includes('permiso denegado'))
    return 'No tenés permisos para esta operación'
  if (msg.includes('duplicate key') || msg.includes('unique constraint'))
    return 'Ya existe un cliente con esos datos'
  if (msg.includes('value too long')) return 'Algún campo excede la longitud máxima'
  if (msg.includes('null value in column') && msg.includes('nombre'))
    return 'El nombre es obligatorio'
  return msg
}

export interface ClienteInput {
  nombre: string
  apellido?: string | null
  dni?: string | null
  telefono?: string | null
  email?: string | null
  direccion?: string | null
  ciudad?: string | null
  fecha_nacimiento?: string | null
  notas?: string | null
}

function sanitize(input: ClienteInput) {
  const limpio = (v: string | null | undefined) => {
    if (v == null) return null
    const t = String(v).trim()
    return t === '' ? null : t
  }
  return {
    nombre: (input.nombre ?? '').trim(),
    apellido: limpio(input.apellido),
    dni: limpio(input.dni),
    telefono: limpio(input.telefono),
    email: limpio(input.email),
    direccion: limpio(input.direccion),
    ciudad: limpio(input.ciudad),
    fecha_nacimiento: limpio(input.fecha_nacimiento),
    notas: limpio(input.notas),
  }
}

function revalidar(id?: string) {
  revalidatePath('/clientes')
  if (id) revalidatePath(`/clientes/${id}`)
  revalidatePath('/pos')
  revalidatePath('/ventas')
}

export async function crearCliente(
  input: ClienteInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const datos = sanitize(input)
    if (!datos.nombre || datos.nombre.length < 2) {
      return { ok: false, error: 'El nombre es obligatorio (mínimo 2 caracteres)' }
    }
    const { supabase, tiendaId } = await requireCtx()
    const { data, error } = await supabase
      .from('clientes')
      .insert({ ...datos, tienda_id: tiendaId })
      .select('id')
      .single()
    if (error) return { ok: false, error: traducirError(error.message) }
    const id = (data as { id: string }).id
    revalidar(id)
    return { ok: true, data: { id } }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export async function actualizarCliente(
  id: string,
  input: ClienteInput
): Promise<ActionResult<{ id: string }>> {
  try {
    if (!id) return { ok: false, error: 'Falta el id del cliente' }
    const datos = sanitize(input)
    if (!datos.nombre || datos.nombre.length < 2) {
      return { ok: false, error: 'El nombre es obligatorio (mínimo 2 caracteres)' }
    }
    const { supabase, tiendaId } = await requireCtx()
    const { error } = await supabase
      .from('clientes')
      .update(datos)
      .eq('tienda_id', tiendaId)
      .eq('id', id)
    if (error) return { ok: false, error: traducirError(error.message) }
    revalidar(id)
    return { ok: true, data: { id } }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export async function desactivarCliente(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    if (!id) return { ok: false, error: 'Falta el id del cliente' }
    const { supabase, tiendaId } = await requireCtx()
    const { error } = await supabase
      .from('clientes')
      .update({ activo: false })
      .eq('tienda_id', tiendaId)
      .eq('id', id)
    if (error) return { ok: false, error: traducirError(error.message) }
    revalidar(id)
    return { ok: true, data: { id } }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export async function reactivarCliente(id: string): Promise<ActionResult<{ id: string }>> {
  try {
    if (!id) return { ok: false, error: 'Falta el id del cliente' }
    const { supabase, tiendaId } = await requireCtx()
    const { error } = await supabase
      .from('clientes')
      .update({ activo: true })
      .eq('tienda_id', tiendaId)
      .eq('id', id)
    if (error) return { ok: false, error: traducirError(error.message) }
    revalidar(id)
    return { ok: true, data: { id } }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}
