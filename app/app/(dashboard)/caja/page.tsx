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
import type { ResumenMesCaja } from '@/lib/caja/queries'

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

  // Obtener rol del usuario para adaptar la vista
  const supabaseCtx = await createClient()
  const { data: authCtx } = await supabaseCtx.auth.getUser()
  const { data: perfilCtx } = authCtx.user
    ? await supabaseCtx.from('perfiles').select('rol').eq('id', authCtx.user.id).maybeSingle()
    : { data: null }
  const esCajero = perfilCtx?.rol === 'vendedor'
  const resumenVacio: ResumenMesCaja = {
    total_sesiones: 0,
    total_ventas_monto: 0,
    total_ventas_cantidad: 0,
    total_neto: 0,
  }

  // Cajero solo necesita la sesión actual — sin historial de meses
  const [sesion, historialData, mesesDisponibles] = await Promise.all([
    obtenerSesionAbierta(),
    esCajero
      ? Promise.resolve<{ sesiones: []; resumen: ResumenMesCaja }>({
          sesiones: [],
          resumen: resumenVacio,
        })
      : listarSesionesPorMes(anio, mesNum),
    esCajero ? Promise.resolve([]) : listarMesesConSesiones(),
  ])
  const { sesiones, resumen } = historialData

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
  } else if (!sesion && !esCajero) {
    // Si no hay sesiones en el mes seleccionado, buscar la más reciente en el mes actual
    const now = new Date()
    const { sesiones: recientes } = await listarSesionesPorMes(now.getFullYear(), now.getMonth() + 1)
    if (recientes.length > 0 && recientes[0].cierre_id) {
      ultimoCierre = await obtenerCierre(recientes[0].id)
      ultimaSesionId = recientes[0].id
    }
  }

  // Cuentas activas para el formulario de movimientos manuales (solo admin/owner)
  let cuentas: CuentaOpcion[] = []
  if (sesion && !esCajero) {
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

  // Movimientos manuales de la sesión activa (solo admin/owner)
  const movimientosManuales = sesion && !esCajero
    ? await listarMovimientosManualesSesion(sesion.fecha_apertura)
    : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-[-0.022em] text-[#0A0A0A]">Caja</h1>
        <p className="text-[13px] text-gray-400 mt-1">
          {esCajero ? 'Apertura y cierre de tu turno.' : 'Apertura, cierre y arqueo de sesiones de caja.'}
        </p>
      </div>

      {sesion ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SesionAbiertaPanel
            sesion={sesion}
            cuentas={cuentas}
            movimientosManuales={movimientosManuales}
            mostrarSaldos={!esCajero}
          />
          <CerrarSesionForm sesion={sesion} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AbrirSesionForm />
          {ultimoCierre && ultimaSesionId && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[14px] font-semibold text-gray-900">Último cierre realizado</h2>
                {!esCajero && (
                  <Link
                    href={`/caja/sesiones/${ultimaSesionId}`}
                    className="text-xs font-medium text-lime-700 hover:text-lime-800 hover:underline transition-colors"
                  >
                    Ver detalle completo →
                  </Link>
                )}
              </div>
              <CierreDetalle cierre={ultimoCierre} />
            </div>
          )}
        </div>
      )}

      {!esCajero && (
        <>
          <HistorialCajaMes
            sesiones={sesiones}
            resumen={resumen}
            mesActual={mesStr}
            mesesDisponibles={mesesParaSelector}
          />
          <div className="text-[13px] text-gray-400">
            Volver al{' '}
            <Link href="/dashboard" className="text-lime-700 hover:text-lime-800 hover:underline transition-colors font-medium">
              dashboard
            </Link>
            .
          </div>
        </>
      )}
    </div>
  )
}

