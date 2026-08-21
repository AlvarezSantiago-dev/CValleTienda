'use client'

import { useEffect } from 'react'
import { LinkButton } from '@/components/ui/Button'

export default function ConfiguracionError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[configuracion]', error)
  }, [error])

  return (
    <div className="max-w-md space-y-3">
      <h1 className="text-lg font-semibold text-fg">No se pudo cargar Configuración</h1>
      <p className="text-sm text-fg-muted">
        Suele ser el logo de esta tienda (SVG o archivo pesado) o una sesión a medias.
        Cerrá sesión, entrá de nuevo, o subí el logo en PNG/JPG.
      </p>
      {error.digest && (
        <p className="text-xs font-mono text-fg-subtle">Código: {error.digest}</p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center h-10 px-4 rounded-[var(--radius-full)] border border-border-default bg-surface text-sm font-medium text-fg"
        >
          Reintentar
        </button>
        <LinkButton href="/dashboard" variant="secondary">
          Ir al inicio
        </LinkButton>
      </div>
    </div>
  )
}
