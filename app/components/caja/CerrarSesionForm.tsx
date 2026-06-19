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
      className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]"
    >
      <div className="px-6 py-5 border-b border-gray-50">
        <h2 className="text-[15px] font-semibold text-gray-900">Cerrar caja</h2>
        <p className="text-[13px] text-gray-400 mt-1">
          Contá el efectivo del cajón y declaralo. Los totales y el desglose por cuenta se calculan
          automáticamente.
        </p>
      </div>

      <div className="px-6 py-5 space-y-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
          <p className="font-medium">Efectivo esperado en cajón:</p>
          <p className="text-xl font-bold tabular-nums mt-0.5">{formatARS(efectivoEsperado)}</p>
          <p className="text-xs text-amber-800 mt-1.5">
            Calculado: apertura + ingresos en efectivo − egresos en efectivo del turno. Comparalo con
            lo que contás físicamente.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Efectivo declarado (opcional)
          </label>
          <InputMonedaARS
            value={efectivo}
            onChange={(n) => {
              setEfectivo(n)
              setEfectivoTocado(true)
            }}
          />
          <p className="text-xs text-gray-400 mt-1">
            Si lo dejás en blanco, no se calcula diferencia.
          </p>
          {diferencia != null && (
            <div
              className={`mt-2 rounded-lg px-3 py-2 text-sm tabular-nums ${
                diferencia === 0
                  ? 'bg-lime-50 text-lime-800 border border-lime-200'
                  : diferencia > 0
                    ? 'bg-gray-50 text-gray-900 border border-gray-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              <span className="font-medium">Diferencia: </span>
              {diferencia > 0 ? '+' : ''}
              {formatARS(diferencia)}
              {diferencia !== 0 && (
                <span className="text-xs ml-1">({diferencia > 0 ? 'sobrante' : 'faltante'})</span>
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
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm space-y-1">
            <p className="font-medium text-gray-900">Confirmar cierre</p>
            <p className="text-gray-600">
              Ventas: {resumenTurno.total_ventas_cantidad} ({formatARS(resumenTurno.total_ventas_monto)})
            </p>
            <p className="text-gray-600">Efectivo esperado: {formatARS(efectivoEsperado)}</p>
            {efectivoTocado && (
              <>
                <p className="text-gray-600">Efectivo declarado: {formatARS(efectivo)}</p>
                {diferencia != null && (
                  <p className="text-gray-600">
                    Diferencia: {diferencia > 0 ? '+' : ''}
                    {formatARS(diferencia)}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2 border-t border-gray-100 flex-wrap">
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
              <span className="text-xs text-gray-400">
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
