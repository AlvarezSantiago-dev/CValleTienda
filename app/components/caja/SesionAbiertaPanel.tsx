'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Plus } from 'lucide-react'
import {
  nombreUsuario,
  type SesionConTotales,
  type ResumenTurno,
  type MovimientoTurno,
} from '@/lib/caja/types'
import { cerrarSesionEmergencia } from '@/app/actions/caja'
import { RegistrarMovimientoForm, type CuentaOpcion } from '@/components/caja/RegistrarMovimientoForm'
import { MetricasTurnoStrip } from '@/components/caja/MetricasTurnoStrip'
import { MovimientosTurnoTabla } from '@/components/caja/MovimientosTurnoTabla'
import { LabelAyuda } from '@/components/caja/LabelAyuda'
import { formatDateTime } from '@/lib/format'
import { formatARS } from '@/lib/format-moneda'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Card } from '@/components/ui/Card'

interface SesionAbiertaPanelProps {
  sesion: SesionConTotales
  cuentas: CuentaOpcion[]
  movimientos: MovimientoTurno[]
  resumenTurno?: ResumenTurno | null
  puedeRegistrarMovimientos?: boolean
  puedeEditarMovimientos?: boolean
  mostrarMetricas?: boolean
}

export function SesionAbiertaPanel({
  sesion,
  cuentas,
  movimientos,
  resumenTurno,
  puedeRegistrarMovimientos = false,
  puedeEditarMovimientos = false,
  mostrarMetricas = true,
}: SesionAbiertaPanelProps) {
  const router = useRouter()
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const [mostrarMovimientoForm, setMostrarMovimientoForm] = useState(false)
  const [mostrarDesglose, setMostrarDesglose] = useState(false)
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

  const mostrarBloqueMovimientos =
    puedeRegistrarMovimientos || puedeEditarMovimientos || movimientos.length > 0

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-border-subtle">
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

      <div className="px-5 py-4 sm:px-6 sm:py-5 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface-sunken px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-fg-subtle">
              <LabelAyuda label="Apertura efectivo" clave="aperturaEfectivo" />
            </p>
            <p className="text-[15px] font-semibold font-mono tabular-nums text-fg">
              {formatARS(sesion.monto_apertura_efectivo)}
            </p>
          </div>
          <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface-sunken px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.08em] font-semibold text-fg-subtle">
              <LabelAyuda label="Ventas del turno" clave="ventasTurno" />
            </p>
            <p className="text-[15px] font-semibold font-mono tabular-nums text-fg">
              {formatARS(sesion.total_ventas_monto)}
            </p>
            <p className="text-xs text-fg-subtle mt-0.5">
              {sesion.total_ventas_cantidad} venta
              {sesion.total_ventas_cantidad === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        {sesion.observaciones_apertura && (
          <div className="rounded-[var(--radius-md)] bg-surface-sunken px-3 py-2 text-sm text-fg">
            <span className="text-xs font-medium text-fg-muted">Observaciones de apertura:</span>{' '}
            {sesion.observaciones_apertura}
          </div>
        )}

        {mostrarMetricas && resumenTurno && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-fg-subtle">
                Números del turno
              </h3>
              <a
                href="#cerrar-caja"
                className="text-xs font-medium text-fg-brand hover:underline min-h-11 inline-flex items-center lg:hidden"
              >
                Ir a cerrar →
              </a>
            </div>
            <MetricasTurnoStrip resumen={resumenTurno} />
            <button
              type="button"
              onClick={() => setMostrarDesglose((v) => !v)}
              className="text-xs font-medium text-fg-brand hover:underline focus-ring rounded"
            >
              {mostrarDesglose ? 'Ocultar desglose' : 'Ver desglose por cuenta'}
            </button>
            {mostrarDesglose && (
              <p className="text-xs text-fg-muted">
                El desglose completo está en el cierre (abajo). Las cuentas globales están en la
                pestaña Cuentas.
              </p>
            )}
          </div>
        )}

        {mostrarBloqueMovimientos && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-fg-subtle">
                Movimientos del turno
              </h3>
              {puedeRegistrarMovimientos && cuentas.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  onClick={() => setMostrarMovimientoForm(true)}
                >
                  <Plus size={14} aria-hidden />
                  Registrar movimiento
                </Button>
              )}
            </div>
            <MovimientosTurnoTabla
              movimientos={movimientos}
              editable={puedeEditarMovimientos}
              cuentas={cuentas}
              titulo=""
            />
          </div>
        )}

        <div className="pt-2 border-t border-border-subtle">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMostrarConfirmacion(true)}
            className="text-danger-soft-fg hover:bg-danger-soft min-h-11 w-full sm:w-auto"
          >
            <AlertTriangle size={14} aria-hidden />
            Cierre de emergencia
          </Button>
          <p className="text-[11px] text-fg-subtle mt-1">
            Solo si no podés completar el arqueo. Queda marcado en el historial.
          </p>
        </div>
      </div>

      {mostrarMovimientoForm && (
        <RegistrarMovimientoForm
          cuentas={cuentas}
          onSuccess={() => setMostrarMovimientoForm(false)}
          onCancel={() => setMostrarMovimientoForm(false)}
          description={
            !puedeEditarMovimientos
              ? 'Registrá un egreso (ej. pago de mercadería) o un ingreso. No podrás editarlo después; pedile al dueño si hay un error.'
              : undefined
          }
          placeholderConcepto="Ej: Pago mercadería / proveedor, Retiro para depósito…"
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
    </Card>
  )
}
