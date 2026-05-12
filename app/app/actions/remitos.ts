'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { EstadoRemito } from '@/types/database'

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

export interface CrearRemitoInput {
  venta_id:          string | null
  destinatario:      string
  direccion_entrega: string
  telefono_entrega:  string
  observaciones:     string
  fecha_entrega:     string
}

export async function crearRemito(input: CrearRemitoInput) {
  if (!input.destinatario.trim()) {
    return { error: 'El campo destinatario es obligatorio.' }
  }

  const { supabase, userId } = await getCtx()

  // Obtener siguiente número de remito: MAX actual + 1 para esta tienda
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id')
    .eq('id', userId)
    .maybeSingle()

  if (!perfil) return { error: 'No se encontró el perfil.' }

  const { data: maxRow } = await supabase
    .from('remitos')
    .select('numero_remito')
    .eq('tienda_id', perfil.tienda_id)
    .order('numero_remito', { ascending: false })
    .limit(1)
    .maybeSingle()

  const numero = ((maxRow as { numero_remito: number } | null)?.numero_remito ?? 0) + 1

  const { data: remito, error: errInsert } = await supabase
    .from('remitos')
    .insert({
      tienda_id:        perfil.tienda_id,
      venta_id:         input.venta_id  || null,
      usuario_id:       userId,
      numero_remito:    numero as number,
      destinatario:     input.destinatario.trim(),
      direccion_entrega: input.direccion_entrega.trim() || null,
      telefono_entrega: input.telefono_entrega.trim()  || null,
      observaciones:    input.observaciones.trim()     || null,
      fecha_entrega:    input.fecha_entrega             || null,
      estado:           'borrador',
    })
    .select('id')
    .single()

  if (errInsert || !remito) {
    return { error: 'Error al crear el remito.' }
  }

  revalidatePath('/remitos')
  return { remitoId: (remito as { id: string }).id }
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
