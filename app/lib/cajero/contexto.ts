// =============================================================
// lib/cajero/contexto.ts
// Contexto de tienda para el Cajero Hablado: se carga una vez por
// request y se inyecta al system prompt (evita tools extra).
// Server-only.
// =============================================================

import { createClient } from '@/lib/supabase/server'
import { getConfigRubro, type Rubro } from '@/lib/rubro/config'

export interface OpcionVarianteCajero {
  id: string
  nombre: string
}

export interface MetodoPagoCajero {
  id: string
  nombre: string
  /** tipo de la cuenta de fondos asociada: 'efectivo' | 'banco' | ... */
  tipoCuenta: string
}

export interface ContextoCajero {
  tiendaId: string
  userId: string
  rol: string
  rubro: Rubro
  redondeoActivo: boolean
  metodosPago: MetodoPagoCajero[]
  /** Primer método asociado a una cuenta de tipo efectivo (default de pago) */
  metodoEfectivoId: string | null
  labelVar1: string
  labelVar2: string
  usarVar1: boolean
  usarVar2: boolean
  var1Existentes: OpcionVarianteCajero[]
  var2Existentes: OpcionVarianteCajero[]
  unidades: string[]
}

/** Devuelve null si no hay sesión válida */
export async function cargarContextoCajero(): Promise<ContextoCajero | null> {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) return null

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('tienda_id, rol')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (!perfil) return null
  const tiendaId = perfil.tienda_id as string

  const [{ data: tienda }, { data: cfg }, { data: metodos }, { data: tallas }, { data: colores }] =
    await Promise.all([
    supabase.from('tiendas').select('rubro').eq('id', tiendaId).maybeSingle(),
    supabase
      .from('configuracion_tienda')
      .select('redondeo_efectivo_activo')
      .eq('tienda_id', tiendaId)
      .maybeSingle(),
    supabase
      .from('metodos_pago')
      .select('id, nombre, activo, cuenta:cuentas_fondos!inner(tipo, activo)')
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .order('orden', { ascending: true }),
    supabase
      .from('tallas')
      .select('id, nombre')
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .order('orden', { ascending: true }),
    supabase
      .from('colores')
      .select('id, nombre')
      .eq('tienda_id', tiendaId)
      .eq('activo', true)
      .order('nombre', { ascending: true }),
  ])

  const metodosPago: MetodoPagoCajero[] = ((metodos ?? []) as Array<Record<string, unknown>>)
    .map((m) => {
      const cuenta = (Array.isArray(m.cuenta) ? m.cuenta[0] : m.cuenta) as
        | { tipo?: string; activo?: boolean }
        | null
      return {
        id: m.id as string,
        nombre: m.nombre as string,
        tipoCuenta: cuenta?.tipo ?? 'otro',
        cuentaActiva: cuenta?.activo !== false,
      }
    })
    .filter((m) => m.cuentaActiva)
    .map(({ id, nombre, tipoCuenta }) => ({ id, nombre, tipoCuenta }))

  const metodoEfectivo = metodosPago.find((m) => m.tipoCuenta === 'efectivo')
  const rubro = ((tienda as { rubro?: string } | null)?.rubro ?? 'generico') as Rubro
  const cfgRubro = getConfigRubro(rubro)

  return {
    tiendaId,
    userId: auth.user.id,
    rol: (perfil.rol as string) ?? 'vendedor',
    rubro,
    redondeoActivo:
      (cfg as { redondeo_efectivo_activo?: boolean } | null)?.redondeo_efectivo_activo !== false,
    metodosPago,
    metodoEfectivoId: metodoEfectivo?.id ?? null,
    labelVar1: cfgRubro.labelVar1,
    labelVar2: cfgRubro.labelVar2,
    usarVar1: cfgRubro.usarVar1,
    usarVar2: cfgRubro.usarVar2,
    var1Existentes: ((tallas ?? []) as OpcionVarianteCajero[]).map((t) => ({
      id: t.id,
      nombre: t.nombre,
    })),
    var2Existentes: ((colores ?? []) as OpcionVarianteCajero[]).map((c) => ({
      id: c.id,
      nombre: c.nombre,
    })),
    unidades: cfgRubro.unidadesDisponibles,
  }
}
