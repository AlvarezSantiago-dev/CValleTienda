import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'
import {
  hoyArgentinaYmd,
  inicioDiaArgentina,
  inicioDiaSiguienteArgentina,
} from '@/lib/datetime'
import { nombreUsuario, type UsuarioLite } from '@/lib/caja/types'

export interface SesionHoyItem {
  id: string
  fecha_apertura: string
  fecha_cierre: string | null
  estado: 'abierta' | 'cerrada'
  usuario_apertura: string | null
  total_ventas_cantidad: number
  total_ventas_monto: number
}

const getCtx = cache(async () => {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('No autenticado')
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!perfil) throw new Error('Perfil no encontrado')
  return { supabase, tiendaId: perfil.tienda_id as string }
})

function normalizeUsuario(raw: unknown): UsuarioLite | null {
  if (!raw) return null
  const u = Array.isArray(raw) ? raw[0] : raw
  if (!u) return null
  const obj = u as Record<string, unknown>
  return {
    id: (obj.id as string) ?? '',
    nombre: (obj.nombre as string | null) ?? null,
    apellido: (obj.apellido as string | null) ?? null,
  }
}

/** Sesiones de caja abiertas hoy (calendario AR), incluye abiertas y cerradas. */
export async function obtenerSesionesHoy(): Promise<SesionHoyItem[]> {
  const { supabase, tiendaId } = await getCtx()
  const hoyYmd = hoyArgentinaYmd()
  const desde = inicioDiaArgentina(hoyYmd)
  const hasta = inicioDiaSiguienteArgentina(hoyYmd)

  const { data, error } = await supabase
    .from('sesiones_caja')
    .select(
      'id, fecha_apertura, fecha_cierre, estado, usuario_apertura:perfiles!sesiones_caja_usuario_apertura_id_fkey(id, nombre, apellido)'
    )
    .eq('tienda_id', tiendaId)
    .gte('fecha_apertura', desde)
    .lt('fecha_apertura', hasta)
    .order('fecha_apertura', { ascending: true })

  if (error || !data || data.length === 0) return []

  const sesiones = data as Array<Record<string, unknown>>
  const ids = sesiones.map((s) => s.id as string)

  const { data: ventas } = await supabase
    .from('ventas')
    .select('sesion_caja_id, total')
    .eq('tienda_id', tiendaId)
    .eq('estado', 'completada')
    .in('sesion_caja_id', ids)

  const totalesMap = new Map<string, { monto: number; cantidad: number }>()
  for (const v of (ventas ?? []) as Array<{ sesion_caja_id: string; total: number | string }>) {
    const curr = totalesMap.get(v.sesion_caja_id) ?? { monto: 0, cantidad: 0 }
    curr.monto += Number(v.total)
    curr.cantidad += 1
    totalesMap.set(v.sesion_caja_id, curr)
  }

  return sesiones.map((s) => {
    const id = s.id as string
    const t = totalesMap.get(id) ?? { monto: 0, cantidad: 0 }
    return {
      id,
      fecha_apertura: s.fecha_apertura as string,
      fecha_cierre: (s.fecha_cierre as string | null) ?? null,
      estado: s.estado as 'abierta' | 'cerrada',
      usuario_apertura: nombreUsuario(normalizeUsuario(s.usuario_apertura)),
      total_ventas_cantidad: t.cantidad,
      total_ventas_monto: t.monto,
    }
  })
}
