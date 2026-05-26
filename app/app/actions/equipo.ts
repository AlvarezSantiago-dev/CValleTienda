'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { RolUsuario } from '@/types/database'

// ─── Helper interno ───────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const, supabase: null, tiendaId: null }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id, rol')
    .eq('id', user.id)
    .maybeSingle()

  if (!perfil) return { error: 'Perfil no encontrado' as const, supabase: null, tiendaId: null }
  if (perfil.rol === 'vendedor') return { error: 'Sin permiso' as const, supabase: null, tiendaId: null }

  return { error: null, supabase, tiendaId: perfil.tienda_id as string }
}

// ─── Listar miembros del equipo ───────────────────────────────

export interface MiembroEquipo {
  id: string
  nombre: string
  apellido: string | null
  rol: RolUsuario
  activo: boolean
  created_at: string
}

export async function listarMiembros(): Promise<{ data: MiembroEquipo[] | null; error: string | null }> {
  const { error, supabase, tiendaId } = await requireAdmin()
  if (error || !supabase || !tiendaId) return { data: null, error: error ?? 'Error' }

  const { data, error: dbErr } = await supabase
    .from('perfiles')
    .select('id, nombre, apellido, rol, activo, created_at')
    .eq('tienda_id', tiendaId)
    .order('created_at', { ascending: true })

  return { data: (data as MiembroEquipo[] | null) ?? [], error: dbErr?.message ?? null }
}

// ─── Crear cajero ─────────────────────────────────────────────

export async function invitarMiembro(formData: FormData): Promise<{ error: string | null }> {
  const { error, tiendaId } = await requireAdmin()
  if (error || !tiendaId) return { error: error ?? 'Error' }

  const email    = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const nombre   = (formData.get('nombre') as string)?.trim()
  const apellido = (formData.get('apellido') as string)?.trim() || null

  if (!email || !password || !nombre) return { error: 'Completá nombre, email y contraseña' }
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres' }

  const adminClient = createAdminClient()
  const { error: createErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Sin confirmación por email — acceso inmediato
    user_metadata: {
      nombre,
      apellido,
      tienda_id: tiendaId,
      rol: 'vendedor',
    },
  })

  if (createErr) {
    if (createErr.message.toLowerCase().includes('already registered') ||
        createErr.message.toLowerCase().includes('already been registered')) {
      return { error: 'Ese email ya está en uso' }
    }
    return { error: 'Error al crear el cajero. Intentá de nuevo.' }
  }

  revalidatePath('/configuracion/equipo')
  return { error: null }
}

// ─── Activar / desactivar miembro ────────────────────────────

export async function toggleActivoMiembro(
  miembroId: string,
  activo: boolean,
): Promise<{ error: string | null }> {
  const { error, supabase, tiendaId } = await requireAdmin()
  if (error || !supabase || !tiendaId) return { error: error ?? 'Error' }

  // Validar que el miembro pertenece a la misma tienda
  const { data: miembro } = await supabase
    .from('perfiles')
    .select('tienda_id, rol')
    .eq('id', miembroId)
    .maybeSingle()

  if (!miembro || miembro.tienda_id !== tiendaId) return { error: 'Sin permiso' }
  if (miembro.rol === 'owner') return { error: 'No podés desactivar al dueño de la tienda' }

  const { error: dbErr } = await supabase
    .from('perfiles')
    .update({ activo })
    .eq('id', miembroId)

  revalidatePath('/configuracion/equipo')
  return { error: dbErr?.message ?? null }
}

// ─── Cambiar contraseña de un cajero ─────────────────────────

export async function cambiarContrasena(
  miembroId: string,
  nuevaPassword: string,
): Promise<{ error: string | null }> {
  const { error, supabase, tiendaId } = await requireAdmin()
  if (error || !supabase || !tiendaId) return { error: error ?? 'Error' }

  if (nuevaPassword.length < 8) return { error: 'Mínimo 8 caracteres' }

  // Verificar que el miembro pertenece a la tienda
  const { data: miembro } = await supabase
    .from('perfiles')
    .select('tienda_id')
    .eq('id', miembroId)
    .maybeSingle()

  if (!miembro || miembro.tienda_id !== tiendaId) return { error: 'Sin permiso' }

  const adminClient = createAdminClient()
  const { error: adminErr } = await adminClient.auth.admin.updateUserById(miembroId, {
    password: nuevaPassword,
  })

  return { error: adminErr?.message ?? null }
}
