'use client'

import { formatARS } from '@/lib/format-moneda'
import { LabelAyuda } from '@/components/caja/LabelAyuda'
import { cn } from '@/components/ui/cn'
import { glosarioCaja } from '@/lib/caja/glosario'

interface Props {
  apertura: number
  esperado: number
  declarado?: number | null
  diferencia?: number | null
  redondeo?: number
  modo: 'preview' | 'cerrado' | 'edicion'
  className?: string
}

export function ArqueoEfectivoCard({
  apertura,
  esperado,
  declarado = null,
  diferencia = null,
  redondeo = 0,
  modo,
  className,
}: Props) {
  const difTone =
    diferencia == null
      ? 'text-fg'
      : diferencia === 0
        ? 'text-success-soft-fg'
        : diferencia > 0
          ? 'text-fg'
          : 'text-danger-soft-fg'

  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-warning-border bg-warning-soft p-4 space-y-3',
        className
      )}
    >
      <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-warning-soft-fg">
        Arqueo de efectivo
      </h3>

      <div
        className={cn(
          'grid gap-3',
          modo === 'cerrado' || diferencia != null ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
        )}
      >
        <Mini
          label={<LabelAyuda label="Apertura" clave="aperturaEfectivo" className="text-xs text-fg-muted" />}
          value={formatARS(apertura)}
        />
        <Mini
          label={
            <LabelAyuda label="Esperado en cajón" clave="efectivoEsperado" className="text-xs text-fg-muted" />
          }
          value={formatARS(esperado)}
          strong
        />
        {redondeo > 0 && (
          <Mini
            label={
              <LabelAyuda
                label="Ajustes redondeo"
                clave="ajustesRedondeo"
                className="text-xs text-fg-muted"
              />
            }
            value={formatARS(redondeo)}
          />
        )}
        {(modo === 'cerrado' || modo === 'edicion') && declarado != null && (
          <Mini
            label={
              <LabelAyuda
                label="Declarado"
                clave="efectivoDeclarado"
                className="text-xs text-fg-muted"
              />
            }
            value={formatARS(declarado)}
          />
        )}
        {modo === 'cerrado' && declarado == null && (
          <Mini
            label={
              <LabelAyuda
                label="Declarado"
                clave="efectivoDeclarado"
                className="text-xs text-fg-muted"
              />
            }
            value="—"
          />
        )}
      </div>

      {diferencia != null && (
        <div className="rounded-[var(--radius-md)] border border-warning-border bg-surface px-3 py-2">
          <p className="text-xs text-fg-muted">
            <LabelAyuda label="Diferencia" clave="diferenciaEfectivo" />
          </p>
          <p className={cn('text-[15px] font-semibold tabular-nums', difTone)}>
            {diferencia > 0 ? '+' : ''}
            {formatARS(diferencia)}
          </p>
          {diferencia !== 0 && (
            <p className="text-xs text-fg-subtle mt-0.5">{diferencia > 0 ? 'Sobrante' : 'Faltante'}</p>
          )}
        </div>
      )}

      {modo === 'preview' && (
        <p className="text-xs text-warning-soft-fg">{glosarioCaja.efectivoEsperado}</p>
      )}
    </div>
  )
}

function Mini({
  label,
  value,
  strong,
}: {
  label: React.ReactNode
  value: string
  strong?: boolean
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-warning-border bg-surface px-3 py-2">
      <div className="mb-0.5">{label}</div>
      <p
        className={cn(
          'text-[15px] tabular-nums',
          strong ? 'font-bold text-warning-soft-fg' : 'font-semibold text-fg'
        )}
      >
        {value}
      </p>
    </div>
  )
}
