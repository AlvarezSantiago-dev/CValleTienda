'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  nombreUsuario,
  type SesionConTotales,
  type ResumenTurno,
  type MovimientoTurno,
} from '@/lib/caja/types'
import { cerrarSesionEmergencia } from '@/app/actions/caja'
import { RegistrarMovimientoForm, type CuentaOpcion } from '@/components/caja/RegistrarMovimientoForm'
import { ResumenTurnoPanel } from '@/components/caja/ResumenTurnoPanel'
import { MovimientosTurnoTabla } from '@/components/caja/MovimientosTurnoTabla'
import { labelTipoCuenta } from '@/lib/caja/labels'
import { formatDateTime, formatDate } from '@/lib/format'
import { formatARS } from '@/lib/format-moneda'

interface SesionAbiertaPanelProps {
  sesion: SesionConTotales
  cuentas: CuentaOpcion[]
  movimientos: MovimientoTurno[]
  mostrarSaldos: boolean
  resumenTurno?: ResumenTurno | null
}

export function SesionAbiertaPanel({
  sesion,
  cuentas,
  movimientos,
  mostrarSaldos,
  resumenTurno,
}: SesionAbiertaPanelProps) {
  const router = useRouter()
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const [mostrarMovimientoForm, setMostrarMovimientoForm] = useState(false)
  const [saldosExpandidos, setSaldosExpandidos] = useState(false)
  const [errorEmergencia, setErrorEmergencia] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleEmergencia() {
    setErrorEmergencia(null)
    startTransition(async () => {
      const res = await cerrarSesionEmergencia(sesion.id)
      if (!res.ok) {
        setErrorEmergencia(res.error ?? 'Error al cerrar la caja')
        return
      }
      setMostrarConfirmacion(false)
      router.refresh()
    })
  }

  const devolucionesCant = resumenTurno?.total_devoluciones_cantidad ?? 0
  const devolucionesMonto = resumenTurno?.total_devoluciones_monto ?? 0

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
      <div className="px-6 py-5 border-b border-gray-50 flex items-start justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-lime-50 border border-lime-200 px-2.5 py-1 text-xs font-semibold text-lime-700">
            <span className="h-1.5 w-1.5 rounded-full bg-lime-500 animate-pulse" />
            Caja abierta
          </span>
          <h2 className="text-[15px] font-semibold text-gray-900 mt-2">Sesión activa</h2>
          <p className="text-[13px] text-gray-400 mt-0.5">
            Abierta el {formatDateTime(sesion.fecha_apertura)}
            {nombreUsuario(sesion.usuario_apertura)
              ? ` por ${nombreUsuario(sesion.usuario_apertura)}`
              : ''}
          </p>
        </div>
        <button
          onClick={() => setMostrarConfirmacion(true)}
          className="flex-shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
          title="Cerrar la caja sin completar el arqueo"
        >
          ⚠️ Cierre emergencia
        </button>
      </div>

      <div className="px-6 py-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Apertura efectivo" value={formatARS(sesion.monto_apertura_efectivo)} />
          <Stat
            label="Ventas del turno"
            value={formatARS(sesion.total_ventas_monto)}
            hint={`${sesion.total_ventas_cantidad} venta${sesion.total_ventas_cantidad === 1 ? '' : 's'}`}
          />
          <Stat
            label="Devoluciones"
            value={formatARS(devolucionesMonto)}
            hint={
              devolucionesCant > 0
                ? `${devolucionesCant} devolución${devolucionesCant === 1 ? '' : 'es'}`
                : 'Sin devoluciones'
            }
          />
        </div>

        {sesion.observaciones_apertura && (
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <span className="text-xs font-medium text-gray-500">Observaciones de apertura:</span>{' '}
            {sesion.observaciones_apertura}
          </div>
        )}

        {mostrarSaldos && resumenTurno && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-gray-400">
                Movimiento del turno
              </h3>
              {cuentas.length > 0 && (
                <button
                  onClick={() => setMostrarMovimientoForm(true)}
                  className="inline-flex items-center gap-1 h-7 px-3 rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  + Registrar movimiento
                </button>
              )}
            </div>
            <ResumenTurnoPanel
              resumen={resumenTurno}
              modo="preview"
              mostrarDesgloseCuentas
              mostrarPagosPorCuenta
              compacto
            />
          </div>
        )}

        {mostrarSaldos && (
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <button
                type="button"
                onClick={() => setSaldosExpandidos((v) => !v)}
                className="flex-1 flex items-center justify-between text-left min-w-0"
              >
                <span className="text-[11px] uppercase tracking-[0.10em] font-semibold text-gray-400">
                  Saldos actuales de cuentas
                </span>
                <span className="text-gray-400 text-sm ml-2">{saldosExpandidos ? '▾' : '▸'}</span>
              </button>
              {cuentas.length > 0 && !resumenTurno && (
                <button
                  type="button"
                  onClick={() => setMostrarMovimientoForm(true)}
                  className="ml-2 inline-flex items-center h-7 px-3 rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:bg-white shrink-0"
                >
                  + Movimiento
                </button>
              )}
            </div>
            {saldosExpandidos && (
              <div className="px-4 pb-4 border-t border-gray-50 space-y-3">
                {sesion.saldos_cuentas.length === 0 ? (
                  <p className="text-[13px] text-gray-400 text-center py-2">No hay cuentas activas</p>
                ) : (
                  sesion.saldos_cuentas.map((c) => (
                    <div
                      key={c.cuenta_fondo_id}
                      className="rounded-lg border border-gray-100 p-3 bg-gray-50/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                            style={{ background: c.color ?? '#65a30d' }}
                          />
                          <span className="text-[13px] font-medium text-gray-900 truncate">{c.nombre}</span>
                          <span className="inline-flex rounded-full bg-white border border-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500 shrink-0">
                            {labelTipoCuenta(c.tipo)}
                          </span>
                        </div>
                        <span className="text-[13px] font-semibold tabular-nums text-gray-900 shrink-0">
                          {formatARS(c.saldo_actual)}
                        </span>
                      </div>
                      {c.pendientePorAcreditar != null && c.pendientePorAcreditar > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100 grid gap-2 sm:grid-cols-2 text-xs text-gray-600">
                          <div>
                            <span className="font-medium text-gray-700">Disponible estimado</span>
                            <div className="tabular-nums">{formatARS(c.saldoDisponibleEstimado ?? 0)}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Pendiente por acreditar</span>
                            <div className="text-red-600 tabular-nums">{formatARS(c.pendientePorAcreditar)}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Comisión futura</span>
                            <div className="tabular-nums">{formatARS(c.pendienteComision ?? 0)}</div>
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">Próxima acreditación</span>
                            <div>
                              {c.proximaFechaAcreditacion
                                ? formatDate(c.proximaFechaAcreditacion, {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {mostrarSaldos && (
          <MovimientosTurnoTabla movimientos={movimientos} editable cuentas={cuentas} />
        )}
      </div>

      {mostrarMovimientoForm && (
        <RegistrarMovimientoForm
          cuentas={cuentas}
          onSuccess={() => setMostrarMovimientoForm(false)}
          onCancel={() => setMostrarMovimientoForm(false)}
        />
      )}

      {mostrarConfirmacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Cierre de emergencia</h3>
                <p className="text-sm text-gray-500 mt-0.5">Esta acción cierra la caja sin completar el arqueo.</p>
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              El cierre quedará marcado como <strong>emergencia</strong> en el historial. No se calculará la
              diferencia de efectivo.
            </div>
            {errorEmergencia && <p className="text-sm text-red-600">{errorEmergencia}</p>}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setMostrarConfirmacion(false)
                  setErrorEmergencia(null)
                }}
                disabled={isPending}
                className="h-10 px-4 text-sm font-medium text-gray-700 border border-gray-200 rounded-full hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleEmergencia}
                disabled={isPending}
                className="h-10 px-4 text-sm font-semibold text-white bg-red-600 rounded-full hover:bg-red-700 disabled:opacity-60"
              >
                {isPending ? 'Cerrando…' : 'Confirmar cierre'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">{label}</p>
      <p className="text-[15px] font-semibold tabular-nums text-gray-900">{value}</p>
      {hint && <p className="text-[12px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}
