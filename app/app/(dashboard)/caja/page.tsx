import Link from 'next/link'
import {
  obtenerSesionAbierta,
  obtenerCierre,
  obtenerResumenTurno,
  listarSesionesPorMes,
  listarMesesConSesiones,
  listarMovimientosTurno,
} from '@/lib/caja/queries'
import { createClient } from '@/lib/supabase/server'
import { SesionAbiertaPanel } from '@/components/caja/SesionAbiertaPanel'
import { CerrarSesionForm } from '@/components/caja/CerrarSesionForm'
import { HistorialCajaMes } from '@/components/caja/HistorialCajaMes'
import { CajaHubTabs } from '@/components/caja/CajaHubTabs'
import { CajaEmptyState } from '@/components/caja/CajaEmptyState'
import { SaldosTiendaPanel } from '@/components/caja/SaldosTiendaPanel'
import type { CuentaOpcion } from '@/components/caja/RegistrarMovimientoForm'
import type { ResumenMesCaja } from '@/lib/caja/queries'
import type { MovimientoTurno } from '@/lib/caja/types'
import { PageHeader } from '@/components/ui/PageHeader'

interface Props {
  searchParams: Promise<{ mes?: string; tab?: string }>
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

function parseTab(
  raw: string | undefined,
  esCajero: boolean
): 'turno' | 'cuentas' | 'historial' {
  if (esCajero) return 'turno'
  if (raw === 'cuentas' || raw === 'historial') return raw
  return 'turno'
}

export default async function CajaPage({ searchParams }: Props) {
  const params = await searchParams
  const { anio, mes: mesNum, str: mesStr } = parsearMes(params.mes)

  const supabaseCtx = await createClient()
  const { data: authCtx } = await supabaseCtx.auth.getUser()
  const { data: perfilCtx } = authCtx.user
    ? await supabaseCtx.from('perfiles').select('rol').eq('id', authCtx.user.id).maybeSingle()
    : { data: null }
  const esCajero = perfilCtx?.rol === 'vendedor'
  const tab = parseTab(params.tab, esCajero)

  const resumenVacio: ResumenMesCaja = {
    total_sesiones: 0,
    total_ventas_monto: 0,
    total_ventas_cantidad: 0,
    total_neto: 0,
  }

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

  const hoy = mesActualStr()
  const mesesParaSelector = mesesDisponibles.includes(hoy)
    ? mesesDisponibles
    : [hoy, ...mesesDisponibles]

  let ultimoCierre = null
  let ultimaSesionId: string | null = null
  if (!sesion && sesiones.length > 0 && sesiones[0].cierre_id) {
    ultimaSesionId = sesiones[0].id
    ultimoCierre = await obtenerCierre(sesiones[0].id)
  } else if (!sesion && !esCajero) {
    const now = new Date()
    const { sesiones: recientes } = await listarSesionesPorMes(
      now.getFullYear(),
      now.getMonth() + 1
    )
    if (recientes.length > 0 && recientes[0].cierre_id) {
      ultimoCierre = await obtenerCierre(recientes[0].id)
      ultimaSesionId = recientes[0].id
    }
  }

  const cuentas: CuentaOpcion[] = sesion
    ? sesion.saldos_cuentas.map((c) => ({
        id: c.cuenta_fondo_id,
        nombre: c.nombre,
        tipo: c.tipo,
        saldo_actual: c.saldo_actual,
        saldo_al_momento: c.saldoAlMomento,
        por_acreditar: c.porAcreditar,
      }))
    : []

  const movimientos: MovimientoTurno[] = sesion ? await listarMovimientosTurno(sesion.id) : []
  const resumenTurno = sesion ? await obtenerResumenTurno(sesion.id) : null

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Caja"
        description={
          esCajero
            ? 'Apertura, cierre y movimientos del turno.'
            : 'Turno, arqueo, cuentas de la tienda e historial de sesiones.'
        }
        className="mb-0"
      />

      {!esCajero && <CajaHubTabs esCajero={esCajero} mesStr={mesStr} tab={tab} />}

      {sesion ? (
        <>
          {(tab === 'turno' || esCajero) && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              <SesionAbiertaPanel
                sesion={sesion}
                cuentas={cuentas}
                movimientos={movimientos}
                resumenTurno={resumenTurno}
                puedeRegistrarMovimientos
                puedeEditarMovimientos={!esCajero}
                mostrarMetricas={!esCajero}
              />
              <CerrarSesionForm
                sesion={sesion}
                resumenTurno={resumenTurno}
                esCajero={esCajero}
              />
            </div>
          )}

          {tab === 'cuentas' && !esCajero && (
            <SaldosTiendaPanel saldos={sesion.saldos_cuentas} />
          )}

          {tab === 'historial' && !esCajero && (
            <HistorialCajaMes
              sesiones={sesiones}
              resumen={resumen}
              mesActual={mesStr}
              mesesDisponibles={mesesParaSelector}
            />
          )}
        </>
      ) : (
        <>
          {(tab === 'turno' || esCajero) && (
            <CajaEmptyState
              ultimoCierre={ultimoCierre}
              ultimaSesionId={ultimaSesionId}
              mostrarLinkDetalle={!esCajero}
            />
          )}

          {tab === 'cuentas' && !esCajero && (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-border-default p-8 text-center text-sm text-fg-muted">
              Abrí una caja para ver los saldos actualizados de las cuentas, o revisalos en el
              dashboard.
            </div>
          )}

          {tab === 'historial' && !esCajero && (
            <HistorialCajaMes
              sesiones={sesiones}
              resumen={resumen}
              mesActual={mesStr}
              mesesDisponibles={mesesParaSelector}
            />
          )}
        </>
      )}

      {!esCajero && tab === 'turno' && (
        <div className="text-sm text-fg-subtle">
          Volver al{' '}
          <Link href="/dashboard" className="text-fg-brand hover:underline font-medium">
            dashboard
          </Link>
          .
        </div>
      )}
    </div>
  )
}
