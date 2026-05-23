'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { nombreUsuario, type SesionConTotales } from '@/lib/caja/types'
import { cerrarSesionEmergencia } from '@/app/actions/caja'
import { RegistrarMovimientoForm, type CuentaOpcion } from '@/components/caja/RegistrarMovimientoForm'
import type { MovimientoManual } from '@/lib/caja/queries'

interface SesionAbiertaPanelProps {
  sesion: SesionConTotales
  cuentas: CuentaOpcion[]
  movimientosManuales: MovimientoManual[]
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function SesionAbiertaPanel({ sesion, cuentas, movimientosManuales }: SesionAbiertaPanelProps) {
  const router = useRouter()
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const [mostrarMovimientoForm, setMostrarMovimientoForm] = useState(false)
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

  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
      {/* Header */}
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

      {/* Contenido */}
      <div className="px-6 py-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Stat label="Apertura efectivo" value={formatARS(sesion.monto_apertura_efectivo)} />
          <Stat
            label="Ventas del turno"
            value={`${sesion.total_ventas_cantidad}`}
            hint={formatARS(sesion.total_ventas_monto)}
          />
          <Stat label="Estado" value="Abierta" tone="ok" />
        </div>

        {sesion.observaciones_apertura && (
          <div className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <span className="text-xs font-medium text-gray-500">Observaciones de apertura:</span>{' '}
            {sesion.observaciones_apertura}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-gray-400">Saldo actual por cuenta</h3>
            <button
              onClick={() => setMostrarMovimientoForm(true)}
              className="inline-flex items-center gap-1 h-7 px-3 rounded-full border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              + Registrar movimiento
            </button>
          </div>
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 text-left">
                  <th className="px-4 py-2.5">Cuenta</th>
                  <th className="px-4 py-2.5">Tipo</th>
                  <th className="px-4 py-2.5 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sesion.saldos_cuentas.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-gray-400 text-center text-[13px]">
                      No hay cuentas activas
                    </td>
                  </tr>
                ) : (
                  sesion.saldos_cuentas.map((c) => (
                    <tr key={c.cuenta_fondo_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 flex items-center gap-2 text-[13px] text-gray-800">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                          style={{ background: c.color ?? '#65a30d' }}
                        />
                        {c.nombre}
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-gray-500">{c.tipo}</td>
                      <td className="px-4 py-2.5 text-right text-[13px] font-semibold text-gray-900 tabular-nums">
                        {formatARS(c.saldo_actual)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Movimientos manuales del turno */}
        {movimientosManuales.length > 0 && (
          <div>
            <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-gray-400 mb-2">
              Movimientos manuales del turno
            </h3>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="min-w-full text-sm">
                <tbody className="divide-y divide-gray-50">
                  {movimientosManuales.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            m.tipo === 'ingreso'
                              ? 'bg-lime-50 text-lime-700 border border-lime-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {m.tipo === 'ingreso' ? '↑ Ingreso' : '↓ Egreso'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[13px] text-gray-700">{m.concepto}</td>
                      <td className="px-4 py-2.5 text-[12px] text-gray-400">{m.nombre_cuenta}</td>
                      <td className="px-4 py-2.5 text-right text-[13px] font-semibold text-gray-900 tabular-nums">
                        {m.tipo === 'egreso' ? '−' : '+'}{formatARS(m.monto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal registrar movimiento */}
      {mostrarMovimientoForm && (
        <RegistrarMovimientoForm
          cuentas={cuentas}
          onSuccess={() => setMostrarMovimientoForm(false)}
          onCancel={() => setMostrarMovimientoForm(false)}
        />
      )}

      {/* Modal confirmación cierre emergencia */}
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
              El cierre quedará marcado como <strong>emergencia</strong> en el historial. No se calculará la diferencia de efectivo.
            </div>
            {errorEmergencia && (
              <p className="text-sm text-red-600">{errorEmergencia}</p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setMostrarConfirmacion(false); setErrorEmergencia(null) }}
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
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'ok' | 'warn'
}) {
  const valueClass =
    tone === 'ok'
      ? 'text-lime-700'
      : tone === 'warn'
      ? 'text-amber-700'
      : 'text-gray-900'
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">{label}</p>
      <p className={`text-[15px] font-semibold tabular-nums ${valueClass}`}>{value}</p>
      {hint && <p className="text-[12px] text-gray-400 mt-0.5 tabular-nums">{hint}</p>}
    </div>
  )
}
