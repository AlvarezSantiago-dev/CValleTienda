'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ChevronDown, ChevronRight, Plus } from 'lucide-react'
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
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

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
    <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden shadow-xs">
      <div className="px-6 py-5 border-b border-border-subtle flex items-start justify-between gap-4">
        <div>
          <Badge variant="brand">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" aria-hidden />
            Caja abierta
          </Badge>
          <h2 className="text-[15px] font-semibold text-fg mt-2">Sesión activa</h2>
          <p className="text-sm text-fg-muted mt-0.5">
            Abierta el {formatDateTime(sesion.fecha_apertura)}
            {nombreUsuario(sesion.usuario_apertura)
              ? ` por ${nombreUsuario(sesion.usuario_apertura)}`
              : ''}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setMostrarConfirmacion(true)}
          className="border-danger-border text-danger-soft-fg hover:bg-danger-soft shrink-0"
          title="Cerrar la caja sin completar el arqueo"
        >
          <AlertTriangle size={14} aria-hidden />
          Cierre emergencia
        </Button>
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
          <div className="rounded-[var(--radius-md)] bg-surface-sunken px-3 py-2 text-sm text-fg">
            <span className="text-xs font-medium text-fg-muted">Observaciones de apertura:</span>{' '}
            {sesion.observaciones_apertura}
          </div>
        )}

        {mostrarSaldos && resumenTurno && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-fg-subtle">
                Movimiento del turno
              </h3>
              {cuentas.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setMostrarMovimientoForm(true)}
                >
                  <Plus size={12} aria-hidden />
                  Registrar movimiento
                </Button>
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
          <div className="rounded-[var(--radius-lg)] border border-border-subtle overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 hover:bg-surface-hover">
              <button
                type="button"
                onClick={() => setSaldosExpandidos((v) => !v)}
                className="flex-1 flex items-center justify-between text-left min-w-0 cursor-pointer focus-ring rounded-[var(--radius-md)]"
              >
                <span className="text-[11px] uppercase tracking-[0.10em] font-semibold text-fg-subtle">
                  Saldos actuales de cuentas
                </span>
                {saldosExpandidos ? (
                  <ChevronDown size={16} className="text-fg-subtle ml-2" aria-hidden />
                ) : (
                  <ChevronRight size={16} className="text-fg-subtle ml-2" aria-hidden />
                )}
              </button>
              {cuentas.length > 0 && !resumenTurno && (
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  className="ml-2 shrink-0"
                  onClick={() => setMostrarMovimientoForm(true)}
                >
                  <Plus size={12} aria-hidden />
                  Movimiento
                </Button>
              )}
            </div>
            {saldosExpandidos && (
              <div className="px-4 pb-4 border-t border-border-subtle space-y-3">
                {sesion.saldos_cuentas.length === 0 ? (
                  <p className="text-sm text-fg-subtle text-center py-2">No hay cuentas activas</p>
                ) : (
                  sesion.saldos_cuentas.map((c) => (
                    <div
                      key={c.cuenta_fondo_id}
                      className="rounded-[var(--radius-md)] border border-border-subtle p-3 bg-surface-sunken/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                            style={{ background: c.color ?? 'var(--brand-600)' }}
                          />
                          <span className="text-sm font-medium text-fg truncate">{c.nombre}</span>
                          <Badge variant="neutral">{labelTipoCuenta(c.tipo)}</Badge>
                        </div>
                        <span className="text-sm font-semibold font-mono tabular-nums text-fg shrink-0">
                          {formatARS(c.saldo_actual)}
                        </span>
                      </div>
                      {c.pendientePorAcreditar != null && c.pendientePorAcreditar > 0 && (
                        <div className="mt-2 pt-2 border-t border-border-subtle grid gap-2 sm:grid-cols-2 text-xs text-fg-muted">
                          <div>
                            <span className="font-medium text-fg">Disponible estimado</span>
                            <div className="font-mono tabular-nums">
                              {formatARS(c.saldoDisponibleEstimado ?? 0)}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-fg">Pendiente por acreditar</span>
                            <div className="text-danger-soft-fg font-mono tabular-nums">
                              {formatARS(c.pendientePorAcreditar)}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-fg">Comisión futura</span>
                            <div className="font-mono tabular-nums">
                              {formatARS(c.pendienteComision ?? 0)}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium text-fg">Próxima acreditación</span>
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

      <Modal
        open={mostrarConfirmacion}
        onClose={() => {
          setMostrarConfirmacion(false)
          setErrorEmergencia(null)
        }}
        title="Cierre de emergencia"
        description="Esta acción cierra la caja sin completar el arqueo."
        size="md"
        footer={
          <>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setMostrarConfirmacion(false)
                setErrorEmergencia(null)
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={handleEmergencia} disabled={isPending}>
              {isPending ? 'Cerrando…' : 'Confirmar cierre'}
            </Button>
          </>
        }
      >
        <div className="rounded-[var(--radius-md)] bg-warning-soft border border-warning-border px-4 py-3 text-sm text-warning-soft-fg">
          El cierre quedará marcado como <strong className="font-semibold">emergencia</strong> en el
          historial. No se calculará la diferencia de efectivo.
        </div>
        {errorEmergencia && <p className="mt-3 text-sm text-danger-soft-fg">{errorEmergencia}</p>}
      </Modal>
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
    <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface-sunken px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-fg-subtle">{label}</p>
      <p className="text-[15px] font-semibold font-mono tabular-nums text-fg">{value}</p>
      {hint && <p className="text-xs text-fg-subtle mt-0.5">{hint}</p>}
    </div>
  )
}
