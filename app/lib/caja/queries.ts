import { createClient } from '@/lib/supabase/server'
import type {
  UsuarioLite,
  SesionConTotales,
  SesionCaja,
  SaldoCuenta,
  ResumenTurno,
  VentaTurnoItem,
  TopProductoTurno,
  MovimientoTurno,
  SesionAbiertaLite,
} from './types'
import { mapResumenTurnoFromRpc } from './resumen-turno'
export type {
  UsuarioLite,
  SesionCaja,
  SaldoCuenta,
  SesionConTotales,
  ResumenTurno,
  VentaTurnoItem,
  TopProductoTurno,
  MovimientoTurno,
  SesionAbiertaLite,
} from './types'
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
  /** Devoluciones con reintegro de dinero. 0 en cierres previos al split. */
  total_devoluciones_reintegro: number
  /** Devoluciones acreditadas como saldo a favor (sin egreso de caja). */
  total_devoluciones_credito: number
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

export async function obtenerSesionAbiertaLite(): Promise<SesionAbiertaLite | null> {
  const { supabase, tiendaId } = await getCtx()

  const { data: sesionRaw, error } = await supabase
    .from('sesiones_caja')
    .select('id, fecha_apertura')
    .eq('tienda_id', tiendaId)
    .eq('estado', 'abierta')
    .maybeSingle()

  if (error || !sesionRaw) return null

  const sesionId = (sesionRaw as { id: string }).id

  const { data: ventas } = await supabase
    .from('ventas')
    .select('total')
    .eq('tienda_id', tiendaId)
    .eq('sesion_caja_id', sesionId)
    .eq('estado', 'completada')

  const lista = (ventas ?? []) as Array<{ total: number | string }>
  const total_ventas_monto = lista.reduce((acc, v) => acc + Number(v.total), 0)

  return {
    id: sesionId,
    fecha_apertura: (sesionRaw as { fecha_apertura: string }).fecha_apertura,
    total_ventas_monto,
    total_ventas_cantidad: lista.length,
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

  const saldosBase: SaldoCuenta[] = ((cuentas ?? []) as Array<Record<string, unknown>>).map(
    (c) => ({
      cuenta_fondo_id: c.id as string,
      nombre: c.nombre as string,
      tipo: c.tipo as string,
      color: (c.color as string | null) ?? null,
      saldo_actual: Number(c.saldo_actual ?? 0),
    })
  )

  const { data: pagosRaw } = await supabase
    .from('pagos_venta')
    .select(
      'id, cuenta_fondo_id, monto_neto, comision_calculada, dias_acreditacion, created_at, venta:ventas!inner(id, created_at, estado)'
    )
    .eq('tienda_id', tiendaId)
    .eq('venta.estado', 'completada')
    .not('cuenta_fondo_id', 'is', null)

  const pagos = (pagosRaw ?? []) as Array<{
    id: string
    cuenta_fondo_id: string | null
    monto_neto: number | string
    comision_calculada: number | string
    dias_acreditacion: number | string
    created_at: string
    venta: Array<{ id: string; created_at: string; estado: string }> | { id: string; created_at: string; estado: string } | null
  }>

  const ahora = new Date()
  const pendingByCuenta = new Map<
    string,
    {
      pendiente: number
      comision: number
      proximaFecha: string | null
      fechas: number
    }
  >()

  for (const pago of pagos) {
    if (!pago.cuenta_fondo_id) continue
    const diasAcreditacion = Number(pago.dias_acreditacion ?? 0)
    if (diasAcreditacion <= 0) continue

    const createdAt = new Date(pago.created_at)
    const fechaAcreditacion = new Date(createdAt)
    fechaAcreditacion.setDate(fechaAcreditacion.getDate() + diasAcreditacion)
    if (fechaAcreditacion <= ahora) continue

    const key = pago.cuenta_fondo_id
    const actual = pendingByCuenta.get(key) ?? {
      pendiente: 0,
      comision: 0,
      proximaFecha: null,
      fechas: 0,
    }

    actual.pendiente += Number(pago.monto_neto ?? 0)
    actual.comision += Number(pago.comision_calculada ?? 0)
    actual.fechas += 1

    const fechaIso = fechaAcreditacion.toISOString()
    if (!actual.proximaFecha || fechaIso < actual.proximaFecha) {
      actual.proximaFecha = fechaIso
    }

    pendingByCuenta.set(key, actual)
  }

  const saldos: SaldoCuenta[] = saldosBase.map((c) => {
    const pending = pendingByCuenta.get(c.cuenta_fondo_id) ?? {
      pendiente: 0,
      comision: 0,
      proximaFecha: null,
      fechas: 0,
    }

    return {
      ...c,
      saldoDisponibleEstimado: Math.max(0, Number((c.saldo_actual ?? 0) - pending.pendiente)),
      pendientePorAcreditar: pending.pendiente,
      pendienteComision: pending.comision,
      proximaFechaAcreditacion: pending.proximaFecha,
      pendienteFechas: pending.fechas,
    }
  })

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
    total_devoluciones_reintegro: Number(c.total_devoluciones_reintegro ?? 0),
    total_devoluciones_credito: Number(c.total_devoluciones_credito ?? 0),
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

// ─── Movimientos manuales de la sesión activa ──────────────────

export interface MovimientoManual {
  id: string
  tipo: 'ingreso' | 'egreso' | 'ajuste'
  concepto: string
  monto: number
  saldo_posterior: number
  nombre_cuenta: string
  tipo_cuenta: string
  created_at: string
}

export async function listarMovimientosManualesSesion(
  sesionFechaApertura: string
): Promise<MovimientoManual[]> {
  const { supabase, tiendaId } = await getCtx()

  const { data, error } = await supabase
    .from('movimientos_fondos')
    .select('id, tipo, concepto, monto, saldo_posterior, created_at, cuenta:cuentas_fondos(nombre, tipo)')
    .eq('tienda_id', tiendaId)
    .is('venta_id', null)
    .gte('created_at', sesionFechaApertura)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return (data as Array<Record<string, unknown>>).map((m) => {
    const cuenta = (Array.isArray(m.cuenta) ? m.cuenta[0] : m.cuenta) as Record<string, unknown> | null
    return {
      id: m.id as string,
      tipo: m.tipo as 'ingreso' | 'egreso' | 'ajuste',
      concepto: m.concepto as string,
      monto: Number(m.monto ?? 0),
      saldo_posterior: Number(m.saldo_posterior ?? 0),
      nombre_cuenta: (cuenta?.nombre as string | null) ?? 'Cuenta',
      tipo_cuenta: (cuenta?.tipo as string | null) ?? '',
      created_at: m.created_at as string,
    }
  })
}

// ─── Historial paginado por mes ────────────────────────────────

export interface ResumenMesCaja {
  total_sesiones: number
  total_ventas_monto: number
  total_ventas_cantidad: number
  total_neto: number
}

export async function listarSesionesPorMes(
  anio: number,
  mes: number // 1-12
): Promise<{ sesiones: SesionListItem[]; resumen: ResumenMesCaja }> {
  const { supabase, tiendaId } = await getCtx()

  const fechaInicio = new Date(anio, mes - 1, 1).toISOString()
  const fechaFin = new Date(anio, mes, 1).toISOString()

  const { data, error } = await supabase
    .from('sesiones_caja')
    .select(
      'id, tienda_id, fecha_apertura, fecha_cierre, monto_apertura_efectivo, estado, observaciones_apertura, observaciones_cierre, usuario_apertura:perfiles!sesiones_caja_usuario_apertura_id_fkey(id, nombre, apellido)'
    )
    .eq('tienda_id', tiendaId)
    .gte('fecha_apertura', fechaInicio)
    .lt('fecha_apertura', fechaFin)
    .order('fecha_apertura', { ascending: false })

  if (error) {
    console.error('listarSesionesPorMes error', error)
    return { sesiones: [], resumen: { total_sesiones: 0, total_ventas_monto: 0, total_ventas_cantidad: 0, total_neto: 0 } }
  }

  const sesiones = (data ?? []) as Array<Record<string, unknown>>
  if (sesiones.length === 0) {
    return { sesiones: [], resumen: { total_sesiones: 0, total_ventas_monto: 0, total_ventas_cantidad: 0, total_neto: 0 } }
  }

  const ids = sesiones.map((s) => s.id as string)

  // Totales de ventas por sesión
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
    .select('id, sesion_id, efectivo_declarado, diferencia_efectivo, tipo_cierre, total_neto')
    .eq('tienda_id', tiendaId)
    .in('sesion_id', ids)

  const cierreIds = (cierres ?? []).map((c) => c.id as string)
  const { data: detalleNetoRaw } = cierreIds.length > 0
    ? await supabase
        .from('cierres_caja_detalle')
        .select('cierre_id, total_neto')
        .eq('tienda_id', tiendaId)
        .in('cierre_id', cierreIds)
    : { data: [] }

  const cierreNetoMap = new Map<string, number>()
  for (const d of (detalleNetoRaw ?? []) as Array<{
    cierre_id: string; total_neto: number | string
  }>) {
    cierreNetoMap.set(
      d.cierre_id,
      (cierreNetoMap.get(d.cierre_id) ?? 0) + Number(d.total_neto)
    )
  }

  const cierreMap = new Map<string, {
    id: string
    efectivo_declarado: number | null
    diferencia_efectivo: number | null
    tipo_cierre: string
    total_neto: number
  }>()
  for (const c of (cierres ?? []) as Array<{
    id: string; sesion_id: string; efectivo_declarado: number | string | null
    diferencia_efectivo: number | string | null; tipo_cierre: string | null; total_neto: number | string | null
  }>) {
    cierreMap.set(c.sesion_id, {
      id: c.id,
      efectivo_declarado: c.efectivo_declarado != null ? Number(c.efectivo_declarado) : null,
      diferencia_efectivo: c.diferencia_efectivo != null ? Number(c.diferencia_efectivo) : null,
      tipo_cierre: c.tipo_cierre ?? 'normal',
      total_neto: Number(c.total_neto ?? 0),
    })
  }

  const sesionesResult: SesionListItem[] = sesiones.map((s) => {
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

  const resumen: ResumenMesCaja = {
    total_sesiones: sesionesResult.length,
    total_ventas_monto: sesionesResult.reduce((a, s) => a + s.total_ventas_monto, 0),
    total_ventas_cantidad: sesionesResult.reduce((a, s) => a + s.total_ventas_cantidad, 0),
    // Para sesiones cerradas: usar el neto calculado por cuenta si está disponible;
    // para sesiones abiertas: usar total_ventas_monto como aproximación.
    total_neto: sesionesResult.reduce((a, s) => {
      const ci = cierreMap.get(s.id)
      const netoDetalle = ci ? cierreNetoMap.get(ci.id) : null
      return a + (netoDetalle != null ? netoDetalle : ci ? ci.total_neto : s.total_ventas_monto)
    }, 0),
  }

  return { sesiones: sesionesResult, resumen }
}

export async function listarMesesConSesiones(): Promise<string[]> {
  const { supabase, tiendaId } = await getCtx()

  const { data, error } = await supabase
    .from('sesiones_caja')
    .select('fecha_apertura')
    .eq('tienda_id', tiendaId)
    .order('fecha_apertura', { ascending: false })

  if (error || !data) return []

  const mesesSet = new Set<string>()
  for (const s of data as Array<{ fecha_apertura: string }>) {
    const d = new Date(s.fecha_apertura)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    mesesSet.add(key)
  }
  return Array.from(mesesSet)
}

// ─── Resumen del turno (preview pre-cierre) ────────────────────

export async function obtenerResumenTurno(sesionId: string): Promise<ResumenTurno | null> {
  const { supabase } = await getCtx()
  const { data, error } = await supabase.rpc('preview_resumen_turno', {
    p_sesion_id: sesionId,
  })
  if (error) {
    console.error('obtenerResumenTurno error', error)
    return null
  }
  return mapResumenTurnoFromRpc(data)
}

export async function listarVentasTurno(
  sesionId: string,
  limit = 10
): Promise<VentaTurnoItem[]> {
  const { supabase, tiendaId } = await getCtx()

  const { data, error } = await supabase
    .from('ventas')
    .select(
      'id, total, created_at, numero_ticket, vendedor:perfiles!ventas_usuario_id_fkey(nombre, apellido)'
    )
    .eq('tienda_id', tiendaId)
    .eq('sesion_caja_id', sesionId)
    .eq('estado', 'completada')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return (data as Array<Record<string, unknown>>).map((v) => {
    const vend = (Array.isArray(v.vendedor) ? v.vendedor[0] : v.vendedor) as
      | { nombre: string | null; apellido: string | null }
      | null
    const vendedor =
      vend != null
        ? `${vend.nombre ?? ''} ${vend.apellido ?? ''}`.trim() || null
        : null
    return {
      id: v.id as string,
      numero_ticket: v.numero_ticket != null ? Number(v.numero_ticket) : null,
      total: Number(v.total ?? 0),
      created_at: v.created_at as string,
      vendedor,
    }
  })
}

export async function obtenerTopProductosTurno(
  sesionId: string,
  limit = 5
): Promise<TopProductoTurno[]> {
  const { supabase, tiendaId } = await getCtx()

  const { data: itemsRaw } = await supabase
    .from('detalles_venta')
    .select('nombre_producto, cantidad, total_linea, venta:ventas!inner(sesion_caja_id, estado)')
    .eq('tienda_id', tiendaId)
    .eq('venta.sesion_caja_id', sesionId)
    .eq('venta.estado', 'completada')

  const agrupado = new Map<string, { cantidad: number; subtotal: number }>()
  for (const item of (itemsRaw ?? []) as Array<{
    nombre_producto: string
    cantidad: number
    total_linea: number | string
  }>) {
    const curr = agrupado.get(item.nombre_producto) ?? { cantidad: 0, subtotal: 0 }
    curr.cantidad += Number(item.cantidad)
    curr.subtotal += Number(item.total_linea)
    agrupado.set(item.nombre_producto, curr)
  }

  return Array.from(agrupado.entries())
    .sort((a, b) => b[1].cantidad - a[1].cantidad)
    .slice(0, limit)
    .map(([nombre, v]) => ({ nombre, cantidad: v.cantidad, subtotal: v.subtotal }))
}

export async function listarMovimientosTurno(sesionId: string): Promise<MovimientoTurno[]> {
  const { supabase, tiendaId } = await getCtx()

  const { data: sesion } = await supabase
    .from('sesiones_caja')
    .select('fecha_apertura')
    .eq('tienda_id', tiendaId)
    .eq('id', sesionId)
    .maybeSingle()

  if (!sesion) return []

  const fechaApertura = (sesion as { fecha_apertura: string }).fecha_apertura

  const { data, error } = await supabase
    .from('movimientos_fondos')
    .select('id, tipo, concepto, monto, saldo_posterior, created_at, venta_id, cuenta:cuentas_fondos(nombre, tipo)')
    .eq('tienda_id', tiendaId)
    .gte('created_at', fechaApertura)
    .order('created_at', { ascending: false })

  if (error || !data) return []

  return (data as Array<Record<string, unknown>>).map((m) => {
    const cuenta = (Array.isArray(m.cuenta) ? m.cuenta[0] : m.cuenta) as Record<string, unknown> | null
    return {
      id: m.id as string,
      tipo: m.tipo as 'ingreso' | 'egreso' | 'ajuste',
      concepto: m.concepto as string,
      monto: Number(m.monto ?? 0),
      saldo_posterior: Number(m.saldo_posterior ?? 0),
      nombre_cuenta: (cuenta?.nombre as string | null) ?? 'Cuenta',
      tipo_cuenta: (cuenta?.tipo as string | null) ?? '',
      created_at: m.created_at as string,
      es_manual: m.venta_id == null,
    }
  })
}
