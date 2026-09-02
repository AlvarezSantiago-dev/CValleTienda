'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface ActionResult<T = unknown> {
  ok: boolean
  error?: string
  data?: T
}

async function requireTiendaId() {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error('No autenticado')
  const { data: perfil, error } = await supabase
    .from('perfiles')
    .select('tienda_id, rol')
    .eq('id', auth.user.id)
    .maybeSingle()
  if (error) throw error
  if (!perfil) throw new Error('Perfil no encontrado')
  return { supabase, tiendaId: perfil.tienda_id as string, rol: perfil.rol as string }
}

function traducirError(msg: string | undefined | null): string {
  if (!msg) return 'Error desconocido'
  if (msg.includes('row-level security')) return 'No tenés permisos para esta operación'
  if (msg.includes('duplicate key')) return 'Ya existe un registro con esos datos'
  if (msg.includes('check constraint')) return 'Algún valor está fuera del rango permitido'
  return msg
}

// =============================================================
// CONFIGURACIÓN DE TIENDA
// =============================================================

export interface ConfigTiendaInput {
  razon_social: string | null
  cuit: string | null
  condicion_iva: string | null
  direccion_legal: string | null
  texto_encabezado: string | null
  texto_pie: string | null
  texto_pie_remito: string | null
  mostrar_logo: boolean
  mostrar_iva: boolean
  prefijo_ticket: string | null
  impresora_ticket: string | null
  ancho_ticket_mm: number
  estilo_remito: 'moderno' | 'clasico'
  /** null = sin balanza, 'precio' = precio embebido, 'peso' = peso embebido */
  balanza_formato: 'precio' | 'peso' | null
  /** Porcentaje de markup default. 0 = desactivado. */
  margen_ganancia_default: number
  /** Días válidos para cambios desde la fecha de venta. 0 o null = no emitir vale. */
  dias_cambio: number | null
}

export async function actualizarConfiguracionTienda(
  input: ConfigTiendaInput
): Promise<ActionResult> {
  try {
    if (![58, 76, 80].includes(input.ancho_ticket_mm)) {
      return { ok: false, error: 'Ancho de ticket inválido (debe ser 58, 76 o 80 mm)' }
    }
    if (input.cuit && !/^\d{8,13}$/.test(input.cuit.replace(/[-\s]/g, ''))) {
      return { ok: false, error: 'CUIT inválido (8 a 13 dígitos)' }
    }
    if (input.prefijo_ticket && input.prefijo_ticket.length > 5) {
      return { ok: false, error: 'Prefijo de ticket demasiado largo (máx 5 caracteres)' }
    }
    if (input.margen_ganancia_default < 0 || input.margen_ganancia_default > 9999) {
      return { ok: false, error: 'El margen debe estar entre 0 y 9999%' }
    }
    if (input.dias_cambio !== null && (input.dias_cambio < 0 || input.dias_cambio > 365)) {
      return { ok: false, error: 'Los días de devolución deben estar entre 0 y 365' }
    }

    const { supabase, tiendaId } = await requireTiendaId()

    const { error } = await supabase
      .from('configuracion_tienda')
      .update({
        razon_social: input.razon_social || null,
        cuit: input.cuit || null,
        condicion_iva: input.condicion_iva || null,
        direccion_legal: input.direccion_legal || null,
        texto_encabezado: input.texto_encabezado || null,
        texto_pie: input.texto_pie || null,
        texto_pie_remito: input.texto_pie_remito || null,
        mostrar_logo: input.mostrar_logo,
        mostrar_iva: input.mostrar_iva,
        prefijo_ticket: input.prefijo_ticket || null,
        impresora_ticket: input.impresora_ticket || null,
        ancho_ticket_mm: input.ancho_ticket_mm,
        estilo_remito: input.estilo_remito,
        balanza_formato: input.balanza_formato ?? null,
        margen_ganancia_default: input.margen_ganancia_default,
        dias_cambio: input.dias_cambio ?? null,
      })
      .eq('tienda_id', tiendaId)

    if (error) return { ok: false, error: traducirError(error.message) }

    revalidatePath('/configuracion')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export type PosModoCobro = 'clasico' | 'guiado'

export async function actualizarPosModoCobro(modo: PosModoCobro): Promise<ActionResult> {
  try {
    if (modo !== 'clasico' && modo !== 'guiado') {
      return { ok: false, error: 'Modo de cobro inválido' }
    }

    const { supabase, tiendaId, rol } = await requireTiendaId()

    if (!['owner', 'admin'].includes(rol)) {
      return { ok: false, error: 'Solo el dueño o administrador puede cambiar esta configuración' }
    }

    const { error } = await supabase
      .from('configuracion_tienda')
      .update({ pos_modo_cobro: modo })
      .eq('tienda_id', tiendaId)

    if (error) return { ok: false, error: traducirError(error.message) }

    revalidatePath('/configuracion/cobros')
    revalidatePath('/pos')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export async function actualizarRedondeoEfectivo(input: {
  activo: boolean
  aviso_ticket?: string | null
}): Promise<ActionResult> {
  try {
    const { supabase, tiendaId, rol } = await requireTiendaId()

    if (!['owner', 'admin'].includes(rol)) {
      return { ok: false, error: 'Solo el dueño o administrador puede cambiar esta configuración' }
    }

    const aviso = (input.aviso_ticket ?? '').trim()
    if (aviso.length > 800) {
      return { ok: false, error: 'El texto del aviso es demasiado largo (máx. 800 caracteres)' }
    }

    const { error } = await supabase
      .from('configuracion_tienda')
      .update({
        redondeo_efectivo_activo: !!input.activo,
        redondeo_efectivo_aviso_ticket: aviso || null,
      })
      .eq('tienda_id', tiendaId)

    if (error) return { ok: false, error: traducirError(error.message) }

    revalidatePath('/configuracion/cobros')
    revalidatePath('/pos')
    revalidatePath('/caja')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

// =============================================================
// RUBRO DE TIENDA
// =============================================================

const RUBROS_VALIDOS = ['ropa', 'ferreteria', 'corralon', 'despensa', 'libreria', 'generico', 'carniceria', 'farmacia', 'verduleria', 'distribuidora']

export async function actualizarRubroTienda(rubro: string): Promise<ActionResult> {
  try {
    if (!RUBROS_VALIDOS.includes(rubro)) {
      return { ok: false, error: 'Rubro inválido' }
    }

    const { supabase, tiendaId, rol } = await requireTiendaId()

    if (!['owner', 'admin'].includes(rol)) {
      return { ok: false, error: 'Solo el dueño o administrador puede cambiar el rubro' }
    }

    const { error } = await supabase
      .from('tiendas')
      .update({ rubro })
      .eq('id', tiendaId)

    if (error) return { ok: false, error: traducirError(error.message) }

    // Sembrar tallas y colores del nuevo rubro (solo agrega los que no existen aún)
    const { data: configRubro } = await supabase
      .from('config_rubro')
      .select('tallas_sugeridas, colores_sugeridas, usar_var1, usar_var2')
      .eq('rubro', rubro)
      .maybeSingle()

    if (configRubro) {
      // Var1 (tallas / marcas / medidas según rubro)
      const sugeridas1 = configRubro.usar_var1
        ? ((configRubro.tallas_sugeridas ?? []) as string[])
        : []
      if (sugeridas1.length > 0) {
        const { data: existentes1 } = await supabase
          .from('tallas')
          .select('nombre, orden')
          .eq('tienda_id', tiendaId)
        const nombresExistentes1 = new Set(
          ((existentes1 ?? []) as Array<{ nombre: string }>).map((t) => t.nombre)
        )
        const maxOrden =
          ((existentes1 ?? []) as Array<{ orden: number }>).reduce(
            (max, t) => Math.max(max, t.orden),
            -1
          )
        const nuevas1 = sugeridas1
          .filter((n) => !nombresExistentes1.has(n))
          .map((nombre, idx) => ({ tienda_id: tiendaId, nombre, orden: maxOrden + 1 + idx }))
        if (nuevas1.length > 0) {
          await supabase.from('tallas').insert(nuevas1)
        }
      }

      // Var2 (colores / presentaciones / materiales según rubro)
      const sugeridas2 = configRubro.usar_var2
        ? ((configRubro.colores_sugeridas ?? []) as string[])
        : []
      if (sugeridas2.length > 0) {
        const { data: existentes2 } = await supabase
          .from('colores')
          .select('nombre')
          .eq('tienda_id', tiendaId)
        const nombresExistentes2 = new Set(
          ((existentes2 ?? []) as Array<{ nombre: string }>).map((c) => c.nombre)
        )
        const nuevas2 = sugeridas2
          .filter((n) => !nombresExistentes2.has(n))
          .map((nombre) => ({ tienda_id: tiendaId, nombre }))
        if (nuevas2.length > 0) {
          await supabase.from('colores').insert(nuevas2)
        }
      }
    }

    revalidatePath('/configuracion/rubro')
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

// =============================================================
// COBROS — helpers compartidos
// =============================================================

type CobrosTabla = 'cuentas_fondos' | 'metodos_pago'

async function siguienteOrden(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tiendaId: string,
  tabla: CobrosTabla
): Promise<number> {
  const { data } = await supabase.from(tabla).select('orden').eq('tienda_id', tiendaId)
  const max = (data ?? []).reduce(
    (m, r) => Math.max(m, Number((r as { orden: number | null }).orden) || 0),
    0
  )
  return max + 1
}

/** orden vacío / ≤0 al crear → max+1; valor >0 se respeta. */
async function resolverOrdenCreacion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tiendaId: string,
  tabla: CobrosTabla,
  orden?: number | null
): Promise<number> {
  const n = Number(orden)
  if (Number.isFinite(n) && n > 0) return n
  return siguienteOrden(supabase, tiendaId, tabla)
}

function revalidateCobros() {
  revalidatePath('/configuracion/cobros')
  revalidatePath('/configuracion/metodos-pago')
  revalidatePath('/configuracion/cuentas-fondos')
}

// =============================================================
// MÉTODOS DE PAGO
// =============================================================

export interface MetodoPagoInput {
  nombre: string
  cuenta_fondo_id: string
  descripcion?: string | null
  comision_porcentaje: number
  dias_acreditacion: number
  /** Al crear: omitir o ≤0 = automático (max+1). Al editar: valor a persistir. */
  orden?: number
}

function validarMetodoPago(input: MetodoPagoInput): string | null {
  if (!input.nombre?.trim()) return 'El nombre es obligatorio'
  if (input.nombre.length > 100) return 'El nombre es demasiado largo'
  if (!input.cuenta_fondo_id) return 'Seleccioná una cuenta de fondos'
  if (input.comision_porcentaje < 0 || input.comision_porcentaje >= 100)
    return 'La comisión debe estar entre 0 y 99.99 %'
  if (input.dias_acreditacion < 0) return 'Los días de acreditación no pueden ser negativos'
  return null
}

export async function crearMetodoPago(input: MetodoPagoInput): Promise<ActionResult> {
  try {
    const err = validarMetodoPago(input)
    if (err) return { ok: false, error: err }

    const { supabase, tiendaId } = await requireTiendaId()
    const orden = await resolverOrdenCreacion(supabase, tiendaId, 'metodos_pago', input.orden)
    const { error } = await supabase.from('metodos_pago').insert({
      tienda_id: tiendaId,
      cuenta_fondo_id: input.cuenta_fondo_id,
      nombre: input.nombre.trim(),
      descripcion: input.descripcion || null,
      comision_porcentaje: input.comision_porcentaje,
      dias_acreditacion: input.dias_acreditacion,
      orden,
      activo: true,
    })

    if (error) return { ok: false, error: traducirError(error.message) }
    revalidateCobros()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export async function actualizarMetodoPago(
  id: string,
  input: MetodoPagoInput
): Promise<ActionResult> {
  try {
    const err = validarMetodoPago(input)
    if (err) return { ok: false, error: err }

    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase
      .from('metodos_pago')
      .update({
        cuenta_fondo_id: input.cuenta_fondo_id,
        nombre: input.nombre.trim(),
        descripcion: input.descripcion || null,
        comision_porcentaje: input.comision_porcentaje,
        dias_acreditacion: input.dias_acreditacion,
        orden: Number(input.orden) || 0,
      })
      .eq('id', id)
      .eq('tienda_id', tiendaId)

    if (error) return { ok: false, error: traducirError(error.message) }
    revalidateCobros()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export async function eliminarMetodoPago(id: string): Promise<ActionResult> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase
      .from('metodos_pago')
      .update({ activo: false })
      .eq('id', id)
      .eq('tienda_id', tiendaId)

    if (error) return { ok: false, error: traducirError(error.message) }
    revalidateCobros()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export async function reactivarMetodoPago(id: string): Promise<ActionResult> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase
      .from('metodos_pago')
      .update({ activo: true })
      .eq('id', id)
      .eq('tienda_id', tiendaId)

    if (error) return { ok: false, error: traducirError(error.message) }
    revalidateCobros()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

// =============================================================
// CUENTAS DE FONDOS
// =============================================================

export interface CuentaFondoInput {
  nombre: string
  tipo: 'efectivo' | 'mercado_pago' | 'banco' | 'otro'
  descripcion?: string | null
  color?: string | null
  icono?: string | null
  /** Al crear: omitir o ≤0 = automático (max+1). Al editar: valor a persistir. */
  orden?: number
}

function validarCuentaFondo(input: CuentaFondoInput): string | null {
  if (!input.nombre?.trim()) return 'El nombre es obligatorio'
  if (input.nombre.length > 100) return 'El nombre es demasiado largo'
  if (!['efectivo', 'mercado_pago', 'banco', 'otro'].includes(input.tipo))
    return 'Tipo de cuenta inválido'
  if (input.color && !/^#[0-9a-fA-F]{6}$/.test(input.color))
    return 'Color hex inválido (formato #RRGGBB)'
  return null
}

export async function crearCuentaFondo(input: CuentaFondoInput): Promise<ActionResult> {
  try {
    const err = validarCuentaFondo(input)
    if (err) return { ok: false, error: err }

    const { supabase, tiendaId } = await requireTiendaId()
    const orden = await resolverOrdenCreacion(supabase, tiendaId, 'cuentas_fondos', input.orden)
    const { error } = await supabase.from('cuentas_fondos').insert({
      tienda_id: tiendaId,
      nombre: input.nombre.trim(),
      tipo: input.tipo,
      descripcion: input.descripcion || null,
      color: input.color || '#6366f1',
      icono: input.icono || 'wallet',
      orden,
      activo: true,
    })

    if (error) return { ok: false, error: traducirError(error.message) }
    revalidateCobros()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export async function actualizarCuentaFondo(
  id: string,
  input: CuentaFondoInput
): Promise<ActionResult> {
  try {
    const err = validarCuentaFondo(input)
    if (err) return { ok: false, error: err }

    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase
      .from('cuentas_fondos')
      .update({
        nombre: input.nombre.trim(),
        tipo: input.tipo,
        descripcion: input.descripcion || null,
        color: input.color || '#6366f1',
        icono: input.icono || 'wallet',
        orden: Number(input.orden) || 0,
      })
      .eq('id', id)
      .eq('tienda_id', tiendaId)

    if (error) return { ok: false, error: traducirError(error.message) }
    revalidateCobros()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export async function eliminarCuentaFondo(id: string): Promise<ActionResult> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()

    // Guard: no permitir desactivar si tiene métodos activos asociados.
    const { count, error: countError } = await supabase
      .from('metodos_pago')
      .select('id', { count: 'exact', head: true })
      .eq('cuenta_fondo_id', id)
      .eq('tienda_id', tiendaId)
      .eq('activo', true)

    if (countError) return { ok: false, error: traducirError(countError.message) }
    if ((count ?? 0) > 0) {
      return {
        ok: false,
        error: `No se puede desactivar: tiene ${count} método(s) de pago activo(s) asociado(s)`,
      }
    }

    const { error } = await supabase
      .from('cuentas_fondos')
      .update({ activo: false })
      .eq('id', id)
      .eq('tienda_id', tiendaId)

    if (error) return { ok: false, error: traducirError(error.message) }
    revalidateCobros()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export async function reactivarCuentaFondo(id: string): Promise<ActionResult> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase
      .from('cuentas_fondos')
      .update({ activo: true })
      .eq('id', id)
      .eq('tienda_id', tiendaId)

    if (error) return { ok: false, error: traducirError(error.message) }
    revalidateCobros()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

// =============================================================
// DATOS FISCALES (separado del mega-form)
// =============================================================

export interface DatosFiscalesInput {
  razon_social: string | null
  cuit: string | null
  condicion_iva: string | null
  direccion_legal: string | null
}

export async function actualizarDatosFiscales(input: DatosFiscalesInput): Promise<ActionResult> {
  try {
    if (input.cuit && !/^\d{8,13}$/.test(input.cuit.replace(/[-\s]/g, ''))) {
      return { ok: false, error: 'CUIT inválido (8 a 13 dígitos)' }
    }
    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase
      .from('configuracion_tienda')
      .update({
        razon_social: input.razon_social || null,
        cuit: input.cuit || null,
        condicion_iva: input.condicion_iva || null,
        direccion_legal: input.direccion_legal || null,
      })
      .eq('tienda_id', tiendaId)

    if (error) return { ok: false, error: traducirError(error.message) }
    revalidatePath('/configuracion')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

// =============================================================
// CONFIG TICKET (separado del mega-form)
// =============================================================

export interface ConfigTicketInput {
  texto_encabezado: string | null
  texto_pie: string | null
  mostrar_logo: boolean
  mostrar_iva: boolean
  prefijo_ticket: string | null
  impresora_ticket: string | null
  ancho_ticket_mm: number
  dias_cambio: number | null
}

export async function actualizarConfigTicket(input: ConfigTicketInput): Promise<ActionResult> {
  try {
    if (![58, 76, 80].includes(input.ancho_ticket_mm)) {
      return { ok: false, error: 'Ancho de ticket inválido (debe ser 58, 76 o 80 mm)' }
    }
    if (input.prefijo_ticket && input.prefijo_ticket.length > 5) {
      return { ok: false, error: 'Prefijo de ticket demasiado largo (máx 5 caracteres)' }
    }
    if (input.dias_cambio !== null && (input.dias_cambio < 0 || input.dias_cambio > 365)) {
      return { ok: false, error: 'Los días de devolución deben estar entre 0 y 365' }
    }
    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase
      .from('configuracion_tienda')
      .update({
        texto_encabezado: input.texto_encabezado || null,
        texto_pie: input.texto_pie || null,
        mostrar_logo: input.mostrar_logo,
        mostrar_iva: input.mostrar_iva,
        prefijo_ticket: input.prefijo_ticket || null,
        impresora_ticket: input.impresora_ticket || null,
        ancho_ticket_mm: input.ancho_ticket_mm,
        dias_cambio: input.dias_cambio ?? null,
      })
      .eq('tienda_id', tiendaId)

    if (error) return { ok: false, error: traducirError(error.message) }
    revalidatePath('/configuracion/ticket')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

// =============================================================
// MARGEN DEFAULT (separado del mega-form)
// =============================================================

export async function actualizarMargenDefault(margen: number): Promise<ActionResult> {
  try {
    if (margen < 0 || margen > 9999) {
      return { ok: false, error: 'El margen debe estar entre 0 y 9999%' }
    }
    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase
      .from('configuracion_tienda')
      .update({ margen_ganancia_default: margen })
      .eq('tienda_id', tiendaId)

    if (error) return { ok: false, error: traducirError(error.message) }
    revalidatePath('/configuracion')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

export async function actualizarRecargoCcDefault(recargo: number): Promise<ActionResult> {
  try {
    if (recargo < 0 || recargo > 9999) {
      return { ok: false, error: 'El recargo debe estar entre 0 y 9999%' }
    }
    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase
      .from('configuracion_tienda')
      .update({ recargo_cc_default: recargo })
      .eq('tienda_id', tiendaId)

    if (error) return { ok: false, error: traducirError(error.message) }
    revalidatePath('/configuracion')
    revalidatePath('/pos')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

// =============================================================
// CONFIG REMITO (separado del mega-form)
// =============================================================

export interface ConfigRemitoInput {
  texto_pie_remito: string | null
  estilo_remito: 'moderno' | 'clasico'
}

export async function actualizarConfigRemito(input: ConfigRemitoInput): Promise<ActionResult> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase
      .from('configuracion_tienda')
      .update({
        texto_pie_remito: input.texto_pie_remito || null,
        estilo_remito: input.estilo_remito,
      })
      .eq('tienda_id', tiendaId)

    if (error) return { ok: false, error: traducirError(error.message) }
    revalidatePath('/configuracion/avanzado')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}

// =============================================================
// CONFIG BALANZA (separado del mega-form)
// =============================================================

export async function actualizarConfigBalanza(
  formato: 'precio' | 'peso' | null
): Promise<ActionResult> {
  try {
    const { supabase, tiendaId } = await requireTiendaId()
    const { error } = await supabase
      .from('configuracion_tienda')
      .update({ balanza_formato: formato ?? null })
      .eq('tienda_id', tiendaId)

    if (error) return { ok: false, error: traducirError(error.message) }
    revalidatePath('/configuracion/avanzado')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: traducirError((e as Error).message) }
  }
}
