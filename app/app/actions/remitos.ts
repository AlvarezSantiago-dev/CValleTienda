'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
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

  revalidatePath('/remitos')
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
  fechaCobro: string
): Promise<{ ok: boolean; error?: string }> {
  if (montoCobrado <= 0) {
    return { ok: false, error: 'El monto debe ser mayor a cero.' }
  }

  const { supabase } = await getCtx()

  const { data: remito } = await supabase
    .from('remitos')
    .select('monto_total, monto_cobrado')
    .eq('id', id)
    .maybeSingle()

  if (!remito) return { ok: false, error: 'Remito no encontrado.' }

  const total = Number((remito as { monto_total: number; monto_cobrado: number }).monto_total)
  const prevCobrado = Number((remito as { monto_total: number; monto_cobrado: number }).monto_cobrado ?? 0)
  const nuevoMontoCobrado = prevCobrado + montoCobrado
  const estadoCobro = nuevoMontoCobrado >= total ? 'cobrado' : 'pendiente'

  const { error } = await supabase
    .from('remitos')
    .update({
      monto_cobrado: nuevoMontoCobrado,
      estado_cobro:  estadoCobro,
      fecha_cobro:   fechaCobro || null,
    })
    .eq('id', id)

  if (error) return { ok: false, error: 'Error al registrar el cobro.' }

  revalidatePath(`/remitos/${id}`)
  revalidatePath('/remitos')
  return { ok: true }
}
