'use client'

import Link from 'next/link'

interface Props {
  href: string
  label?: string
  className?: string
}

/**
 * Abre la ruta HTML print-friendly (Guardar como PDF).
 * No usa PrintBridge — solo descarga/compartir.
 */
export function BotonDescargarDoc({
  href,
  label = 'Descargar PDF',
  className,
}: Props) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={
        className ??
        'inline-flex items-center justify-center gap-2 min-h-11 h-10 px-4 border border-border-default text-fg text-sm font-medium rounded-[var(--radius-full)] hover:bg-surface-hover transition w-full sm:w-auto'
      }
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M8 2v8M5 7l3 3 3-3M3 13h10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </Link>
  )
}
