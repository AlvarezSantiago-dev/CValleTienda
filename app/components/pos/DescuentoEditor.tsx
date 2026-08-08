'use client'

import { useState } from 'react'
import { InputMonedaARS } from '@/components/ui/InputMonedaARS'
import { descuentoDesdePorcentaje } from '@/lib/pos/descuento'
import { formatARS } from '@/lib/format'

type TipoDescuento = 'porcentaje' | 'monto'

interface DescuentoEditorProps {
  subtotal: number
  descuento: number
  onDescuentoChange: (v: number) => void
  size?: 'default' | 'large'
  /** Si el editor está dentro del paso "Con descuento" del wizard. */
  embedded?: boolean
}

function parsePorcentajeInput(raw: string): number | null {
  const pct = Number(raw.replace(',', '.').trim())
  if (!Number.isFinite(pct) || pct <= 0) return null
  return pct
}

export function DescuentoEditor({
  subtotal,
  descuento,
  onDescuentoChange,
  size = 'default',
}: DescuentoEditorProps) {
  const [tipo, setTipo] = useState<TipoDescuento>('porcentaje')
  const [pctCustom, setPctCustom] = useState('')

  const large = size === 'large'
  const btnClass = large
    ? 'min-h-[48px] px-6 rounded-xl text-base font-semibold'
    : 'min-h-[36px] px-3 rounded-lg text-[12px] font-semibold'
  const inputPctClass = large
    ? 'w-28 h-12 px-3 border border-gray-200 rounded-xl text-base text-right'
    : 'w-24 h-9 px-2 border border-gray-200 rounded-lg text-[13px] text-right'

  const pctPreview = parsePorcentajeInput(pctCustom)

  function quitar() {
    setPctCustom('')
    onDescuentoChange(0)
  }

  function cambiarTipo(nuevo: TipoDescuento) {
    setTipo(nuevo)
    setPctCustom('')
    onDescuentoChange(0)
  }

  function aplicarPreset(pct: number) {
    setTipo('porcentaje')
    setPctCustom(String(pct))
    onDescuentoChange(descuentoDesdePorcentaje(subtotal, pct))
  }

  function aplicarPorcentajeCustom() {
    const pct = parsePorcentajeInput(pctCustom)
    if (pct == null) return
    setTipo('porcentaje')
    onDescuentoChange(descuentoDesdePorcentaje(subtotal, pct))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => cambiarTipo('porcentaje')}
          className={[
            btnClass,
            'transition-colors',
            tipo === 'porcentaje'
              ? 'bg-primary text-fg ring-2 ring-primary/30'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800',
          ].join(' ')}
        >
          Porcentaje
        </button>
        <button
          type="button"
          onClick={() => cambiarTipo('monto')}
          className={[
            btnClass,
            'transition-colors',
            tipo === 'monto'
              ? 'bg-primary text-fg ring-2 ring-primary/30'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-800',
          ].join(' ')}
        >
          Monto fijo
        </button>
        {(descuento > 0 || pctCustom) && (
          <button
            type="button"
            onClick={quitar}
            className={`${btnClass} text-gray-500 hover:bg-gray-100 transition-colors`}
          >
            Quitar
          </button>
        )}
      </div>

      {tipo === 'porcentaje' && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {[5, 10, 15].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => aplicarPreset(pct)}
                className={`${btnClass} bg-gray-100 hover:bg-primary-soft text-gray-800 transition-colors`}
              >
                {pct}%
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="descuento_pct_editor"
              className={large ? 'text-sm text-gray-600' : 'text-[13px] text-gray-600 shrink-0'}
            >
              Porcentaje
            </label>
            <input
              id="descuento_pct_editor"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={pctCustom}
              onChange={(e) => setPctCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  aplicarPorcentajeCustom()
                }
              }}
              placeholder="Ej. 7.5"
              className={`${inputPctClass} focus:ring-2 focus:ring-primary/40 focus:border-primary tabular-nums`}
            />
            <span className={large ? 'text-sm text-gray-500' : 'text-[13px] text-gray-500'}>%</span>
            <button
              type="button"
              onClick={aplicarPorcentajeCustom}
              className={`${btnClass} bg-primary text-fg hover:bg-brand-400 transition-colors`}
            >
              Aplicar
            </button>
          </div>
          {pctPreview != null && (
            <p className={large ? 'text-sm text-gray-500' : 'text-[11px] text-gray-500'}>
              ≈ {formatARS(descuentoDesdePorcentaje(subtotal, pctPreview))} de descuento
            </p>
          )}
        </div>
      )}

      {tipo === 'monto' && (
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="descuento_monto_editor"
            className={large ? 'text-sm text-gray-600 shrink-0' : 'text-[13px] text-gray-600 shrink-0'}
          >
            Monto de descuento
          </label>
          <InputMonedaARS
            id="descuento_monto_editor"
            value={descuento}
            onChange={onDescuentoChange}
            size={size}
            className={large ? 'w-44' : 'w-36'}
          />
        </div>
      )}

      {descuento > 0 && (
        <p className={large ? 'text-sm text-amber-700 font-medium' : 'text-[12px] text-amber-700'}>
          Descuento aplicado: {formatARS(descuento)}
        </p>
      )}
    </div>
  )
}
