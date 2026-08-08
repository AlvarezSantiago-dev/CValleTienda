'use client'

import { logoutAction } from '@/app/actions/auth'

interface AccesoVencidoScreenProps {
  tiendaNombre: string
  planLabel: string
  accesoHasta: string | null
}

function fmtFecha(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function AccesoVencidoScreen({
  tiendaNombre,
  planLabel,
  accesoHasta,
}: AccesoVencidoScreenProps) {
  const wa = process.env.NEXT_PUBLIC_WHATSAPP_SOPORTE?.replace(/\D/g, '') ?? ''
  const waHref = wa ? `https://wa.me/${wa}` : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F4] px-4">
      <div className="max-w-md w-full bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-8 shadow-sm space-y-6 text-center">
        <div className="w-14 h-14 mx-auto rounded-[var(--radius-full)] bg-danger-soft flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="w-7 h-7 text-red-500"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-[22px] font-bold tracking-[-0.022em] text-fg">
            Tu suscripción está vencida
          </h1>
          <p className="text-[14px] text-fg-muted leading-relaxed">
            El acceso a <strong className="text-fg">{tiendaNombre}</strong> se
            reactivará cuando registremos tu pago. Contactanos para renovar el mes.
          </p>
        </div>

        <div className="rounded-[var(--radius-lg)] bg-surface-sunken border border-border-subtle px-4 py-3 text-left space-y-1.5 text-[13px]">
          <div className="flex justify-between gap-2">
            <span className="text-fg-subtle">Plan</span>
            <span className="font-semibold text-fg uppercase">{planLabel}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-fg-subtle">Venció</span>
            <span className="font-semibold text-fg">{fmtFecha(accesoHasta)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 inline-flex items-center justify-center rounded-[var(--radius-lg)] bg-fg text-white text-[13px] font-semibold hover:bg-fg-muted transition-colors"
            >
              Contactar por WhatsApp
            </a>
          ) : (
            <p className="text-[13px] text-fg-muted px-2">
              Contactá a soporte para renovar tu acceso.
            </p>
          )}
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full h-11 rounded-[var(--radius-lg)] border border-border-default text-[13px] font-medium text-fg-muted hover:bg-surface-sunken transition-colors"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
