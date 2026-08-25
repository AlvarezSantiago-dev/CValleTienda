'use client'

import { useRef, useState, useTransition } from 'react'
import { ajustarStock } from '@/app/actions/stock'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { formatSignedDelta } from '@/lib/format'
import { useAutoFocus } from '@/lib/hooks/useAutoFocus'
import { useRubro } from '@/components/layout/RubroProvider'
import { rubroPermiteStockInfinito } from '@/lib/rubro/config'
import {
  esStockInfinito,
  formatStockDisplay,
  STOCK_INFINITO,
} from '@/lib/stock/infinito'
import { cn } from '@/components/ui/cn'

interface AjusteFormProps {
  varianteId: string
  stockActual: number
  unidadDeMedida?: string
  autoFocus?: boolean
  compact?: boolean
}

const UNIDADES_ENTERAS = new Set(['unidad', 'pack', 'caja', 'bolsa'])

export function AjusteForm({
  varianteId,
  stockActual,
  unidadDeMedida = 'unidad',
  autoFocus = false,
  compact = false,
}: AjusteFormProps) {
  const { rubro } = useRubro()
  const permiteInfinito = rubroPermiteStockInfinito(rubro)
  const [nuevoStock, setNuevoStock] = useState(String(stockActual))
  const [motivo, setMotivo] = useState('')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null)
  const stockRef = useRef<HTMLInputElement>(null)
  useAutoFocus(stockRef, [], true, autoFocus)

  const nuevoNum = Number(nuevoStock)
  const delta = Number.isFinite(nuevoNum) ? nuevoNum - stockActual : 0
  const deltaSignificativo =
    esStockInfinito(nuevoNum) ||
    esStockInfinito(stockActual) ||
    Math.abs(delta) > Math.max(Math.abs(stockActual), 5)

  function ejecutarAjuste() {
    setConfirmMsg(null)
    startTransition(async () => {
      const res = await ajustarStock({
        variante_id: varianteId,
        nuevo_stock: nuevoNum,
        motivo,
      })
      if (res.ok) {
        if (res.data?.delta === 0) {
          setFeedback({ ok: true, msg: 'Sin cambios — el stock ya era el indicado' })
        } else {
          setFeedback({
            ok: true,
            msg: `Stock ajustado (${formatSignedDelta(res.data?.delta ?? 0)})`,
          })
          setMotivo('')
        }
      } else {
        setFeedback({ ok: false, msg: res.error ?? 'Error desconocido' })
      }
    })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFeedback(null)

    if (deltaSignificativo) {
      const msg = esStockInfinito(nuevoNum)
        ? 'Vas a marcar este producto como stock ilimitado (-1). ¿Confirmás?'
        : esStockInfinito(stockActual)
          ? `Vas a salir de stock ilimitado y dejar ${nuevoNum}. ¿Confirmás?`
          : `El ajuste cambia el stock en ${formatSignedDelta(delta)} unidades. ¿Estás seguro?`
      setConfirmMsg(msg)
      return
    }

    ejecutarAjuste()
  }

  const stockLabel = formatStockDisplay(stockActual, { permiteInfinito })

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className={cn(
          'bg-surface rounded-[var(--radius-lg)] space-y-4',
          compact ? 'p-0' : 'border border-border-subtle p-5 shadow-xs'
        )}
      >
        {!compact && (
          <div>
            <h3 className="text-sm font-semibold text-fg">Ajuste por inventario</h3>
            <p className="text-sm text-fg-muted mt-0.5">
              Indicá el stock final esperado tras un conteo físico. El sistema calcula la diferencia.
              {permiteInfinito && (
                <>
                  {' '}
                  Usá <strong className="font-semibold text-fg">-1</strong> para stock ilimitado (no se
                  descuenta al vender).
                </>
              )}
            </p>
          </div>
        )}

        <Input
          ref={stockRef}
          label={`Nuevo stock (actual: ${stockLabel}${unidadDeMedida !== 'unidad' && !esStockInfinito(stockActual) ? ' ' + unidadDeMedida : ''})`}
          type="number"
          min={permiteInfinito ? STOCK_INFINITO : 0}
          step={UNIDADES_ENTERAS.has(unidadDeMedida) ? 1 : 0.001}
          required
          value={nuevoStock}
          onChange={(e) => setNuevoStock(e.target.value)}
        />

        {permiteInfinito && (
          <button
            type="button"
            className="text-xs text-fg-brand font-medium hover:underline cursor-pointer"
            onClick={() => setNuevoStock(String(STOCK_INFINITO))}
          >
            Marcar como ilimitado (−1)
          </button>
        )}

        <div
          className={cn(
            'text-sm rounded-[var(--radius-md)] px-3 py-2 border',
            delta > 0
              ? 'text-success-soft-fg bg-success-soft border-success-border'
              : delta < 0
                ? 'text-danger-soft-fg bg-danger-soft border-danger-border'
                : 'text-fg bg-surface-sunken border-border-default'
          )}
          aria-live="polite"
        >
          Diferencia:{' '}
          <span className="font-semibold font-mono tabular-nums">
            {Number.isFinite(nuevoNum) ? formatSignedDelta(delta) : '—'}
          </span>
        </div>

        <Textarea
          label="Motivo"
          required
          rows={2}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej. Inventario físico — faltaban 3 prendas"
        />

        {feedback && (
          <div
            className={cn(
              'text-sm rounded-[var(--radius-md)] px-3 py-2 border',
              feedback.ok
                ? 'bg-success-soft text-success-soft-fg border-success-border'
                : 'bg-danger-soft text-danger-soft-fg border-danger-border'
            )}
          >
            {feedback.msg}
          </div>
        )}

        <Button
          type="submit"
          variant="secondary"
          disabled={isPending || delta === 0}
          className="w-full min-h-11"
        >
          {isPending ? 'Procesando…' : 'Aplicar ajuste'}
        </Button>
      </form>

      <Modal
        open={Boolean(confirmMsg)}
        onClose={() => setConfirmMsg(null)}
        title="Confirmar ajuste"
        size="sm"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setConfirmMsg(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={ejecutarAjuste} disabled={isPending}>
              {isPending ? 'Aplicando…' : 'Confirmar'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">{confirmMsg}</p>
      </Modal>
    </>
  )
}
