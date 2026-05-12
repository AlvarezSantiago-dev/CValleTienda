import { createClient } from '@/lib/supabase/server'
import type { UsuarioLite, SesionConTotales, SesionCaja } from './types'
export type { UsuarioLite, SesionCaja, SaldoCuenta, SesionConTotales } from './types'
export { nombreUsuario } from './types'

export interface SesionListItem extends SesionCaja {
  total_ventas_monto: number
  total_ventas_cantidad: number
  cierre_id: string | null
  efectivo_declarado: number | null
  diferencia_efectivo: number | null
  tipo_cierre: 'normal' | 'emergencia' | 'automatico' | null
}

export interface CierreDetalleRow {
  id: string
  cuenta_fondo_id: string | null
  nombre_cuenta: string
  tipo_cuenta: string
  total_ingresos: number
  total_egresos: number
  comision_estimada: number
  total_neto: number
  saldo_antes_turno: number
  saldo_despues_turno: number
}

export interface Cierre {
  id: string
  sesion_id: string
  fecha_cierre: string
  tipo_cierre: 'normal' | 'emergencia' | 'automatico'
  total_ventas_monto: number
  total_ventas_cantidad: number
  total_devoluciones_monto: number
  total_devoluciones_cantidad: number
  total_neto: number
  monto_apertura_efectivo: number
  efectivo_esperado: number
  efectivo_declarado: number | null
  diferencia_efectivo: number | null
  observaciones: string | null
  detalles: CierreDetalleRow[]
}

async function getCtx() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('No autenticado')
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!perfil) throw new Error('Perfil no encontrado')
  return { supabase, tiendaId: perfil.tienda_id as string, userId: auth.user.id }
}

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

export async function obtenerSesionAbierta(): Promise<SesionConTotales | null> {
  const { supabase, tiendaId } = await getCtx()

  const { data: sesionRaw, error } = await supabase
    .from('sesiones_caja')
    .select(
      'id, tienda_id, fecha_apertura, fecha_cierre, monto_apertura_efectivo, estado, observaciones_apertura, observaciones_cierre, usuario_apertura:perfiles!sesiones_caja_usuario_apertura_id_fkey(id, nombre, apellido)'
    )
    .eq('tienda_id', tiendaId)
    .eq('estado', 'abierta')
    .maybeSingle()

  if (error) {
    console.error('obtenerSesionAbierta error', error)
    return null
  }
  if (!sesionRaw) return null

  const sesion = sesionRaw as Record<string, unknown>
  const sesionId = sesion.id as string

  // Totales del turno
  const { data: ventas } = await supabase
    .from('ventas')
    .select('total')
    .eq('tienda_id', tiendaId)
    .eq('sesion_caja_id', sesionId)
    .eq('estado', 'completada')

  const lista = (ventas ?? []) as Array<{ total: number | string }>
  const total_ventas_monto = lista.reduce((acc, v) => acc + Number(v.total), 0)
  const total_ventas_cantidad = lista.length

  // Saldos actuales por cuenta
  const { data: cuentas } = await supabase
    .from('cuentas_fondos')
    .select('id, nombre, tipo, color, saldo_actual')
    .eq('tienda_id', tiendaId)
    .eq('activo', true)
    .order('orden', { ascending: true })

  const saldos: SaldoCuenta[] = ((cuentas ?? []) as Array<Record<string, unknown>>).map(
    (c) => ({
      cuenta_fondo_id: c.id as string,
      nombre: c.nombre as string,
      tipo: c.tipo as string,
      color: (c.color as string | null) ?? null,
      saldo_actual: Number(c.saldo_actual ?? 0),
    })
  )

  return {
    id: sesionId,
    tienda_id: tiendaId,
    fecha_apertura: sesion.fecha_apertura as string,
    fecha_cierre: (sesion.fecha_cierre as string | null) ?? null,
    monto_apertura_efectivo: Number(sesion.monto_apertura_efectivo ?? 0),
    estado: 'abierta',
    observaciones_apertura: (sesion.observaciones_apertura as string | null) ?? null,
    observaciones_cierre: (sesion.observaciones_cierre as string | null) ?? null,
    usuario_apertura: normalizeUsuario(sesion.usuario_apertura),
    total_ventas_monto,
    total_ventas_cantidad,
    saldos_cuentas: saldos,
  }
}

export async function listarSesiones(limit = 10): Promise<SesionListItem[]> {
  const { supabase, tiendaId } = await getCtx()

  const { data, error } = await supabase
    .from('sesiones_caja')
    .select(
      'id, tienda_id, fecha_apertura, fecha_cierre, monto_apertura_efectivo, estado, observaciones_apertura, observaciones_cierre, usuario_apertura:perfiles!sesiones_caja_usuario_apertura_id_fkey(id, nombre, apellido)'
    )
    .eq('tienda_id', tiendaId)
    .order('fecha_apertura', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('listarSesiones error', error)
    return []
  }

  const sesiones = (data ?? []) as Array<Record<string, unknown>>
  if (sesiones.length === 0) return []

  const ids = sesiones.map((s) => s.id as string)

  // Totales por sesión (una query)
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

  // Cierres por sesión
  const { data: cierres } = await supabase
    .from('cierres_caja')
    .select('id, sesion_id, efectivo_declarado, diferencia_efectivo, tipo_cierre')
    .eq('tienda_id', tiendaId)
    .in('sesion_id', ids)

  const cierreMap = new Map<
    string,
    { id: string; efectivo_declarado: number | null; diferencia_efectivo: number | null; tipo_cierre: string }
  >()
  for (const c of (cierres ?? []) as Array<{
    id: string
    sesion_id: string
    efectivo_declarado: number | string | null
    diferencia_efectivo: number | string | null
    tipo_cierre: string | null
  }>) {
    cierreMap.set(c.sesion_id, {
      id: c.id,
      efectivo_declarado: c.efectivo_declarado != null ? Number(c.efectivo_declarado) : null,
      diferencia_efectivo:
        c.diferencia_efectivo != null ? Number(c.diferencia_efectivo) : null,
      tipo_cierre: c.tipo_cierre ?? 'normal',
    })
  }

  return sesiones.map((s) => {
    const id = s.id as string
    const t = totalesMap.get(id) ?? { monto: 0, cantidad: 0 }
    const ci = cierreMap.get(id) ?? null
    return {
      id,
      tienda_id: tiendaId,
      fecha_apertura: s.fecha_apertura as string,
      fecha_cierre: (s.fecha_cierre as string | null) ?? null,
      monto_apertura_efectivo: Number(s.monto_apertura_efectivo ?? 0),
      estado: s.estado as 'abierta' | 'cerrada',
      observaciones_apertura: (s.observaciones_apertura as string | null) ?? null,
      observaciones_cierre: (s.observaciones_cierre as string | null) ?? null,
      usuario_apertura: normalizeUsuario(s.usuario_apertura),
      total_ventas_monto: t.monto,
      total_ventas_cantidad: t.cantidad,
      cierre_id: ci?.id ?? null,
      efectivo_declarado: ci?.efectivo_declarado ?? null,
      diferencia_efectivo: ci?.diferencia_efectivo ?? null,
      tipo_cierre: (ci?.tipo_cierre ?? null) as 'normal' | 'emergencia' | 'automatico' | null,
    }
  })
}

export async function obtenerCierre(sesionId: string): Promise<Cierre | null> {
  const { supabase, tiendaId } = await getCtx()

  const { data: cierre, error } = await supabase
    .from('cierres_caja')
    .select('*')
    .eq('tienda_id', tiendaId)
    .eq('sesion_id', sesionId)
    .maybeSingle()

  if (error || !cierre) return null

  const c = cierre as Record<string, unknown>

  const { data: detallesRaw } = await supabase
    .from('cierres_caja_detalle')
    .select('*')
    .eq('tienda_id', tiendaId)
    .eq('cierre_id', c.id as string)

  const detalles: CierreDetalleRow[] = ((detallesRaw ?? []) as Array<Record<string, unknown>>).map(
    (d) => ({
      id: d.id as string,
      cuenta_fondo_id: (d.cuenta_fondo_id as string | null) ?? null,
      nombre_cuenta: d.nombre_cuenta as string,
      tipo_cuenta: d.tipo_cuenta as string,
      total_ingresos: Number(d.total_ingresos ?? 0),
      total_egresos: Number(d.total_egresos ?? 0),
      comision_estimada: Number(d.comision_estimada ?? 0),
      total_neto: Number(d.total_neto ?? 0),
      saldo_antes_turno: Number(d.saldo_antes_turno ?? 0),
      saldo_despues_turno: Number(d.saldo_despues_turno ?? 0),
    })
  )

  return {
    id: c.id as string,
    sesion_id: c.sesion_id as string,
    fecha_cierre: c.fecha_cierre as string,
    total_ventas_monto: Number(c.total_ventas_monto ?? 0),
    total_ventas_cantidad: Number(c.total_ventas_cantidad ?? 0),
    total_devoluciones_monto: Number(c.total_devoluciones_monto ?? 0),
    total_devoluciones_cantidad: Number(c.total_devoluciones_cantidad ?? 0),
    total_neto: Number(c.total_neto ?? 0),
    monto_apertura_efectivo: Number(c.monto_apertura_efectivo ?? 0),
    efectivo_esperado: Number(c.efectivo_esperado ?? 0),
    efectivo_declarado: c.efectivo_declarado != null ? Number(c.efectivo_declarado) : null,
    diferencia_efectivo:
      c.diferencia_efectivo != null ? Number(c.diferencia_efectivo) : null,
    observaciones: (c.observaciones as string | null) ?? null,
    tipo_cierre: ((c.tipo_cierre as string) ?? 'normal') as 'normal' | 'emergencia' | 'automatico',
    detalles,
  }
}

export interface SesionResumen {
  id: string
  fecha_apertura: string
  fecha_cierre: string | null
  estado: 'abierta' | 'cerrada'
  usuario_apertura: UsuarioLite | null
  cierre: Cierre | null
}

export async function obtenerSesionResumen(sesionId: string): Promise<SesionResumen | null> {
  const { supabase, tiendaId } = await getCtx()
  const { data: raw, error } = await supabase
    .from('sesiones_caja')
    .select(
      'id, fecha_apertura, fecha_cierre, estado, usuario_apertura:perfiles!sesiones_caja_usuario_apertura_id_fkey(id, nombre, apellido)'
    )
    .eq('tienda_id', tiendaId)
    .eq('id', sesionId)
    .maybeSingle()
  if (error || !raw) return null
  const s = raw as Record<string, unknown>
  const cierre = await obtenerCierre(sesionId)
  return {
    id: s.id as string,
    fecha_apertura: s.fecha_apertura as string,
    fecha_cierre: (s.fecha_cierre as string | null) ?? null,
    estado: s.estado as 'abierta' | 'cerrada',
    usuario_apertura: normalizeUsuario(s.usuario_apertura),
    cierre,
  }
}
