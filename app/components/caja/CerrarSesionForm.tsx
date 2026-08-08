'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { InputMonedaARS } from '@/components/ui/InputMonedaARS'
import { cerrarSesion } from '@/app/actions/caja'
import type { SesionConTotales, ResumenTurno } from '@/lib/caja/types'
import { ResumenTurnoPanel } from '@/components/caja/ResumenTurnoPanel'
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
  const [obs, setObs] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const efectivoEsperado = resumenTurno?.efectivo_esperado ?? 0
  const diferencia =
    efectivoTocado && efectivo >= 0 ? efectivo - efectivoEsperado : null

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!confirm) {
      setConfirm(true)
      return
    }

    startTransition(async () => {
      const declarado = efectivoTocado ? efectivo : null
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
    <form
      onSubmit={onSubmit}
      className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden shadow-xs"
    >
      <div className="px-6 py-5 border-b border-border-subtle">
        <h2 className="text-[15px] font-semibold text-fg">Cerrar caja</h2>
        <p className="text-sm text-fg-muted mt-1">
          Contá el efectivo del cajón y declaralo. Los totales y el desglose por cuenta se calculan
          automáticamente.
        </p>
      </div>

      <div className="px-6 py-5 space-y-4">
        {error && (
          <div className="rounded-[var(--radius-md)] border border-danger-border bg-danger-soft p-3 text-sm text-danger-soft-fg">
            {error}
          </div>
        )}

        <div className="rounded-[var(--radius-md)] bg-warning-soft border border-warning-border p-4 text-sm text-warning-soft-fg">
          <p className="font-medium">Efectivo esperado en cajón:</p>
          <p className="text-xl font-bold font-mono tabular-nums mt-0.5">
            {formatARS(efectivoEsperado)}
          </p>
          <p className="text-xs mt-1.5 opacity-90">
            Calculado: apertura + ingresos en efectivo − egresos en efectivo del turno. Comparalo con
            lo que contás físicamente.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-fg mb-1.5">
            Efectivo declarado (opcional)
          </label>
          <InputMonedaARS
            value={efectivo}
            onChange={(n) => {
              setEfectivo(n)
              setEfectivoTocado(true)
            }}
          />
          <p className="text-xs text-fg-subtle mt-1">
            Si lo dejás en blanco, no se calcula diferencia.
          </p>
          {diferencia != null && (
            <div
              className={cn(
                'mt-2 rounded-[var(--radius-md)] px-3 py-2 text-sm font-mono tabular-nums border',
                diferencia === 0
                  ? 'bg-success-soft text-success-soft-fg border-success-border'
                  : diferencia > 0
                    ? 'bg-surface-sunken text-fg border-border-default'
                    : 'bg-danger-soft text-danger-soft-fg border-danger-border'
              )}
            >
              <span className="font-medium">Diferencia: </span>
              {diferencia > 0 ? '+' : ''}
              {formatARS(diferencia)}
              {diferencia !== 0 && (
                <span className="text-xs ml-1 font-sans">
                  ({diferencia > 0 ? 'sobrante' : 'faltante'})
                </span>
              )}
            </div>
          )}
        </div>

        <Textarea
          label="Observaciones del cierre (opcional)"
          rows={2}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
        />

        {resumenTurno && (
          <ResumenTurnoPanel
            resumen={resumenTurno}
            modo="preview"
            colapsable
            mostrarDesgloseCuentas={!esCajero}
            mostrarPagosPorCuenta={!esCajero}
            compacto={esCajero}
          />
        )}

        {confirm && resumenTurno && (
          <div className="rounded-[var(--radius-md)] border border-border-default bg-surface-sunken p-3 text-sm space-y-1">
            <p className="font-medium text-fg">Confirmar cierre</p>
            <p className="text-fg-muted">
              Ventas: {resumenTurno.total_ventas_cantidad} (
              {formatARS(resumenTurno.total_ventas_monto)})
            </p>
            <p className="text-fg-muted">Efectivo esperado: {formatARS(efectivoEsperado)}</p>
            {efectivoTocado && (
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
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-border-subtle flex-wrap">
          {confirm ? (
            <>
              <Button type="submit" variant="danger" disabled={isPending}>
                {isPending ? 'Cerrando…' : 'Confirmar cierre'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirm(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <span className="text-xs text-fg-subtle">
                Al confirmar, no se podrán registrar más ventas en esta sesión.
              </span>
            </>
          ) : (
            <Button type="submit">Cerrar caja</Button>
          )}
        </div>
      </div>
    </form>
  )
}
