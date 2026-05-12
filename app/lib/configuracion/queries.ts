import { createClient } from '@/lib/supabase/server'

export interface ConfiguracionTienda {
  id: string
  tienda_id: string
  razon_social: string | null
  cuit: string | null
  condicion_iva: string | null
  direccion_legal: string | null
  texto_encabezado: string | null
  texto_pie: string | null
  mostrar_logo: boolean
  mostrar_iva: boolean
  prefijo_ticket: string | null
  ultimo_numero_ticket: number
  ultimo_numero_devolucion: number
  impresora_ticket: string | null
  ancho_ticket_mm: number
  moneda: string
  simbolo_moneda: string
  separador_decimal: string
  separador_miles: string
  logo_url: string | null
}

export interface CuentaFondoLite {
  id: string
  nombre: string
  tipo: string
  color: string | null
}

export interface MetodoPago {
  id: string
  tienda_id: string
  cuenta_fondo_id: string
  nombre: string
  descripcion: string | null
  comision_porcentaje: number
  dias_acreditacion: number
  activo: boolean
  orden: number
  cuenta_fondo: CuentaFondoLite | null
}

export interface CuentaFondo {
  id: string
  tienda_id: string
  nombre: string
  tipo: 'efectivo' | 'mercado_pago' | 'banco' | 'otro'
  descripcion: string | null
  saldo_actual: number
  color: string | null
  icono: string | null
  activo: boolean
  orden: number
  metodos_count: number
}

async function getTiendaId() {
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
}

export async function obtenerConfiguracionTienda(): Promise<ConfiguracionTienda | null> {
  const { supabase, tiendaId } = await getTiendaId()
  const { data, error } = await supabase
    .from('configuracion_tienda')
    .select('*')
    .eq('tienda_id', tiendaId)
    .maybeSingle()
  if (error) {
    console.error('obtenerConfiguracionTienda error', error)
    return null
  }
  // Traer logo_url de tiendas
  const { data: tienda } = await supabase
    .from('tiendas')
    .select('logo_url')
    .eq('id', tiendaId)
    .maybeSingle()
  const logo_url = (tienda as { logo_url?: string | null } | null)?.logo_url ?? null
  return data ? { ...(data as ConfiguracionTienda), logo_url } : null
}

export async function obtenerRubroTienda(): Promise<string> {
  const { supabase, tiendaId } = await getTiendaId()
  const { data, error } = await supabase
    .from('tiendas')
    .select('rubro')
    .eq('id', tiendaId)
    .maybeSingle()
  if (error || !data) return 'generico'
  return (data as { rubro: string }).rubro
}

export async function listarMetodosPago(soloActivos = false): Promise<MetodoPago[]> {
  const { supabase, tiendaId } = await getTiendaId()
  let query = supabase
    .from('metodos_pago')
    .select(
      'id, tienda_id, cuenta_fondo_id, nombre, descripcion, comision_porcentaje, dias_acreditacion, activo, orden, cuenta_fondo:cuentas_fondos(id, nombre, tipo, color)'
    )
    .eq('tienda_id', tiendaId)
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true })

  if (soloActivos) query = query.eq('activo', true)

  const { data, error } = await query
  if (error) {
    console.error('listarMetodosPago error', error)
    return []
  }
  // El join puede venir como array o como objeto según la versión; lo normalizamos.
  return (data ?? []).map((m: Record<string, unknown>) => ({
    ...(m as object),
    cuenta_fondo: Array.isArray(m.cuenta_fondo)
      ? (m.cuenta_fondo[0] ?? null)
      : (m.cuenta_fondo ?? null),
  })) as MetodoPago[]
}

export async function listarCuentasFondos(soloActivas = false): Promise<CuentaFondo[]> {
  const { supabase, tiendaId } = await getTiendaId()
  let query = supabase
    .from('cuentas_fondos')
    .select('*')
    .eq('tienda_id', tiendaId)
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true })

  if (soloActivas) query = query.eq('activo', true)

  const { data, error } = await query
  if (error) {
    console.error('listarCuentasFondos error', error)
    return []
  }
  const cuentas = (data ?? []) as Array<Omit<CuentaFondo, 'metodos_count'>>

  if (cuentas.length === 0) return []

  // Contar métodos activos por cuenta (una sola query batch).
  const { data: metodos } = await supabase
    .from('metodos_pago')
    .select('cuenta_fondo_id')
    .eq('tienda_id', tiendaId)
    .eq('activo', true)

  const counts = new Map<string, number>()
  for (const m of (metodos ?? []) as Array<{ cuenta_fondo_id: string }>) {
    counts.set(m.cuenta_fondo_id, (counts.get(m.cuenta_fondo_id) ?? 0) + 1)
  }

  return cuentas.map((c) => ({
    ...c,
    saldo_actual: Number(c.saldo_actual ?? 0),
    metodos_count: counts.get(c.id) ?? 0,
  }))
}
