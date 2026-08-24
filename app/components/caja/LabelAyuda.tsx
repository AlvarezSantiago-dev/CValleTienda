'use client'

import { CircleHelp } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import { cn } from '@/components/ui/cn'
import { glosarioCaja, type ClaveGlosarioCaja } from '@/lib/caja/glosario'

/** Label con ayuda corta (tooltip). */
export function LabelAyuda({
  label,
  clave,
  className,
}: {
  label: string
  clave: ClaveGlosarioCaja
  className?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span>{label}</span>
      <Tooltip content={glosarioCaja[clave]}>
        <button
          type="button"
          className="text-fg-subtle hover:text-fg-muted focus-ring rounded-full p-0.5 cursor-help"
          aria-label={`Ayuda: ${label}`}
        >
          <CircleHelp size={12} aria-hidden />
        </button>
      </Tooltip>
    </span>
  )
}
