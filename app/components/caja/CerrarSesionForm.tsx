'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { InputMonedaARS } from '@/components/ui/InputMonedaARS'
import { Card } from '@/components/ui/Card'
import { cerrarSesion } from '@/app/actions/caja'
import type { SesionConTotales, ResumenTurno } from '@/lib/caja/types'
import { ArqueoEfectivoCard } from '@/components/caja/ArqueoEfectivoCard'
import { MetricasTurnoStrip } from '@/components/caja/MetricasTurnoStrip'
import { ResumenTurnoPanel } from '@/components/caja/ResumenTurnoPanel'
import { LabelAyuda } from '@/components/caja/LabelAyuda'
import { glosarioCaja } from '@/lib/caja/glosario'
import { formatARS } from '@/lib/format-moneda'
import { cn } from '@/components/ui/cn'

interface CerrarSesionFormProps {
  sesion: SesionConTotales
  resumenTurno: ResumenTurno | null
  esCajero?: boolean
}

export function CerrarSesionForm({ sesion, resumenTurno, esCajero = false }: CerrarSesionFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [efectivo, setEfectivo] = useState(0)
  const [efectivoTocado, setEfectivoTocado] = useState(false)
  const [noConte, setNoConte] = useState(false)
  const [obs, setObs] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const efectivoEsperado = resumenTurno?.efectivo_esperado ?? 0
  const diferencia =
    !noConte && efectivoTocado && efectivo >= 0 ? efectivo - efectivoEsperado : null

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!confirm) {
      setConfirm(true)
      return
    }

    startTransition(async () => {
      const declarado = noConte || !efectivoTocado ? null : efectivo
      if (declarado != null && (!Number.isFinite(declarado) || declarado < 0)) {
        setError('El efectivo declarado debe ser un número ≥ 0')
        return
      }
      const res = await cerrarSesion({
        sesion_id: sesion.id,
        efectivo_declarado: declarado,
        observaciones: obs || null,
      })
      if (res.ok) {
        router.refresh()
      } else {
        setError(res.error ?? 'Error al cerrar caja')
        setConfirm(false)
      }
    })
  }

  return (
    <form id="cerrar-caja" onSubmit={onSubmit}>
      <Card padding="none" className="overflow-hidden">
        <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-border-subtle">
          <h2 className="text-[15px] font-semibold text-fg">Cerrar caja</h2>
          <p className="text-sm text-fg-muted mt-1">
            Contá el efectivo del cajón y comparalo con el esperado. El resto se calcula solo.
          </p>
        </div>

        <div className="px-5 py-4 sm:px-6 sm:py-5 space-y-4 pb-28 lg:pb-5">
          {error && (
            <div className="rounded-[var(--radius-md)] border border-danger-border bg-danger-soft p-3 text-sm text-danger-soft-fg">
              {error}
            </div>
          )}

          <ArqueoEfectivoCard
            apertura={resumenTurno?.monto_apertura_efectivo ?? sesion.monto_apertura_efectivo}
            esperado={efectivoEsperado}
            redondeo={resumenTurno?.total_redondeo_efectivo ?? 0}
            declarado={!noConte && efectivoTocado ? efectivo : null}
            diferencia={diferencia}
            modo="edicion"
          />

          <div>
            <label className="block text-sm font-medium text-fg mb-1.5">
              <LabelAyuda label="Efectivo declarado" clave="efectivoDeclarado" />
            </label>
            <InputMonedaARS
              value={efectivo}
              disabled={noConte}
              onChange={(n) => {
                setEfectivo(n)
                setEfectivoTocado(true)
                setNoConte(false)
              }}
            />
            <label className="mt-3 flex items-start gap-2.5 text-sm text-fg cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-border-default"
                checked={noConte}
                onChange={(e) => {
                  const checked = e.target.checked
                  setNoConte(checked)
                  if (checked) {
                    setEfectivoTocado(false)
                    setEfectivo(0)
                  }
                }}
              />
              <span>
                No conté el cajón
                <span className="block text-xs text-fg-subtle mt-0.5">
                  {glosarioCaja.efectivoDeclarado}
                </span>
              </span>
            </label>
          </div>

          <Textarea
            label="Observaciones del cierre (opcional)"
            rows={2}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
          />

          {resumenTurno && !esCajero && (
            <details className="rounded-[var(--radius-lg)] border border-border-subtle group">
              <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-semibold text-fg flex items-center justify-between hover:bg-surface-hover rounded-[var(--radius-lg)]">
                Ver desglose del turno
                <span className="text-fg-subtle text-sm group-open:hidden">▸</span>
                <span className="text-fg-subtle text-sm hidden group-open:inline">▾</span>
              </summary>
              <div className="px-4 pb-4 border-t border-border-subtle pt-3 space-y-3">
                <MetricasTurnoStrip resumen={resumenTurno} />
                <ResumenTurnoPanel
                  resumen={resumenTurno}
                  modo="preview"
                  mostrarDesgloseCuentas
                  mostrarPagosPorCuenta
                  compacto
                  soloDesgloses
                />
              </div>
            </details>
          )}

          {confirm && resumenTurno && (
            <div className="rounded-[var(--radius-md)] border border-border-default bg-surface-sunken p-3 text-sm space-y-1">
              <p className="font-medium text-fg">Confirmar cierre</p>
              <p className="text-fg-muted">
                Ventas: {resumenTurno.total_ventas_cantidad} (
                {formatARS(resumenTurno.total_ventas_monto)})
              </p>
              <p className="text-fg-muted">Efectivo esperado: {formatARS(efectivoEsperado)}</p>
              {!noConte && efectivoTocado && (
                <>
                  <p className="text-fg-muted">Efectivo declarado: {formatARS(efectivo)}</p>
                  {diferencia != null && (
                    <p className="text-fg-muted">
                      Diferencia: {diferencia > 0 ? '+' : ''}
                      {formatARS(diferencia)}
                    </p>
                  )}
                </>
              )}
              {noConte && <p className="text-fg-muted">Sin conteo físico (sin diferencia).</p>}
            </div>
          )}

          {/* Desktop actions */}
          <div className="hidden lg:flex items-center gap-3 pt-2 border-t border-border-subtle flex-wrap">
            <AccionesCierre
              confirm={confirm}
              isPending={isPending}
              onCancelConfirm={() => setConfirm(false)}
            />
          </div>
        </div>

        {/* Mobile sticky */}
        <div
          className={cn(
            'lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border-subtle bg-surface/95 backdrop-blur-sm',
            'px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.06)]'
          )}
        >
          <div className="flex flex-col gap-2 max-w-lg mx-auto">
            <AccionesCierre
              confirm={confirm}
              isPending={isPending}
              onCancelConfirm={() => setConfirm(false)}
              fullWidth
            />
          </div>
        </div>
      </Card>
    </form>
  )
}

function AccionesCierre({
  confirm,
  isPending,
  onCancelConfirm,
  fullWidth,
}: {
  confirm: boolean
  isPending: boolean
  onCancelConfirm: () => void
  fullWidth?: boolean
}) {
  if (confirm) {
    return (
      <>
        <Button
          type="submit"
          variant="danger"
          disabled={isPending}
          className={cn('min-h-11', fullWidth && 'w-full')}
        >
          {isPending ? 'Cerrando…' : 'Confirmar cierre'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancelConfirm}
          disabled={isPending}
          className={cn('min-h-11', fullWidth && 'w-full')}
        >
          Cancelar
        </Button>
        <span className="text-xs text-fg-subtle">
          Al confirmar, no se podrán registrar más ventas en esta sesión.
        </span>
      </>
    )
  }
  return (
    <Button type="submit" className={cn('min-h-11', fullWidth && 'w-full')}>
      Cerrar caja
    </Button>
  )
}
