import Link from 'next/link'
import {
  obtenerSesionAbierta,
  obtenerCierre,
  listarSesionesPorMes,
  listarMesesConSesiones,
  listarMovimientosManualesSesion,
} from '@/lib/caja/queries'
import { createClient } from '@/lib/supabase/server'
import { AbrirSesionForm } from '@/components/caja/AbrirSesionForm'
import { SesionAbiertaPanel } from '@/components/caja/SesionAbiertaPanel'
import { CerrarSesionForm } from '@/components/caja/CerrarSesionForm'
import { CierreDetalle } from '@/components/caja/CierreDetalle'
import { HistorialCajaMes } from '@/components/caja/HistorialCajaMes'
import type { CuentaOpcion } from '@/components/caja/RegistrarMovimientoForm'

interface Props {
  searchParams: Promise<{ mes?: string }>
}

function mesActualStr(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function parsearMes(mes?: string): { anio: number; mes: number; str: string } {
  const hoy = mesActualStr()
  const str = mes && /^\d{4}-\d{2}$/.test(mes) ? mes : hoy
  const [a, m] = str.split('-').map(Number)
  return { anio: a, mes: m, str }
}

export default async function CajaPage({ searchParams }: Props) {
  const params = await searchParams
  const { anio, mes: mesNum, str: mesStr } = parsearMes(params.mes)

  const [sesion, { sesiones, resumen }, mesesDisponibles] = await Promise.all([
    obtenerSesionAbierta(),
    listarSesionesPorMes(anio, mesNum),
    listarMesesConSesiones(),
  ])

  // Asegurarse de que el mes actual siempre aparezca en el selector
  const hoy = mesActualStr()
  const mesesParaSelector = mesesDisponibles.includes(hoy)
    ? mesesDisponibles
    : [hoy, ...mesesDisponibles]

  // Último cierre (para mostrar junto al form de apertura)
  let ultimoCierre = null
  let ultimaSesionId: string | null = null
  if (!sesion && sesiones.length > 0 && sesiones[0].cierre_id) {
    ultimaSesionId = sesiones[0].id
    ultimoCierre = await obtenerCierre(sesiones[0].id)
  } else if (!sesion) {
    // Si no hay sesiones en el mes seleccionado, buscar la más reciente en el mes actual
    const now = new Date()
    const { sesiones: recientes } = await listarSesionesPorMes(now.getFullYear(), now.getMonth() + 1)
    if (recientes.length > 0 && recientes[0].cierre_id) {
      ultimoCierre = await obtenerCierre(recientes[0].id)
      ultimaSesionId = recientes[0].id
    }
  }

  // Cuentas activas para el formulario de movimientos manuales
  let cuentas: CuentaOpcion[] = []
  if (sesion) {
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    if (auth.user) {
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('tienda_id')
        .eq('id', auth.user.id)
        .maybeSingle()
      if (perfil) {
        const { data: cuentasRaw } = await supabase
          .from('cuentas_fondos')
          .select('id, nombre, tipo, saldo_actual')
          .eq('tienda_id', (perfil as { tienda_id: string }).tienda_id)
          .eq('activo', true)
          .order('orden', { ascending: true })
        cuentas = ((cuentasRaw ?? []) as Array<{ id: string; nombre: string; tipo: string; saldo_actual: number }>).map(
          (c) => ({ id: c.id, nombre: c.nombre, tipo: c.tipo, saldo_actual: Number(c.saldo_actual ?? 0) })
        )
      }
    }
  }

  // Movimientos manuales de la sesión activa
  const movimientosManuales = sesion
    ? await listarMovimientosManualesSesion(sesion.fecha_apertura)
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Caja</h1>
        <p className="text-[13px] text-gray-400 mt-1">
          Apertura, cierre y arqueo de sesiones de caja.
        </p>
      </div>

      {sesion ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SesionAbiertaPanel
            sesion={sesion}
            cuentas={cuentas}
            movimientosManuales={movimientosManuales}
          />
          <CerrarSesionForm sesion={sesion} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AbrirSesionForm />
          {ultimoCierre && ultimaSesionId && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[13px] font-semibold text-[#0A0A0A]">
                  Último cierre realizado
                </h2>
                <Link
                  href={`/caja/sesiones/${ultimaSesionId}`}
                  className="text-xs text-lime-700 hover:underline"
                >
                  Ver detalle completo →
                </Link>
              </div>
              <CierreDetalle cierre={ultimoCierre} />
            </div>
          )}
        </div>
      )}

      <HistorialCajaMes
        sesiones={sesiones}
        resumen={resumen}
        mesActual={mesStr}
        mesesDisponibles={mesesParaSelector}
      />

      <div className="text-sm text-gray-500">
        Volver al{' '}
        <Link href="/dashboard" className="text-lime-700 hover:underline">
          dashboard
        </Link>
        .
      </div>
    </div>
  )
}

