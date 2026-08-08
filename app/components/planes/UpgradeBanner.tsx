import Link from 'next/link'
import type { Feature } from '@/lib/planes/config'
import { DESCRIPCION_FEATURE, PRECIOS } from '@/lib/planes/config'

interface UpgradeBannerProps {
  feature: Feature
}

export function UpgradeBanner({ feature }: UpgradeBannerProps) {
  const descripcion = DESCRIPCION_FEATURE[feature]

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Ícono */}
        <div className="w-16 h-16 bg-surface-sunken rounded-[var(--radius-full)] flex items-center justify-center mx-auto">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-8 h-8 text-fg-subtle"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        {/* Texto */}
        <div className="space-y-2">
          <h2 className="text-[22px] font-bold tracking-[-0.022em] text-fg">
            Función exclusiva del plan Pro
          </h2>
          <p className="text-[14px] text-fg-muted leading-relaxed">
            {descripcion}
          </p>
        </div>

        {/* Precio */}
        <div className="bg-surface-sunken border border-border-subtle rounded-[var(--radius-lg)] px-5 py-4 text-left space-y-2">
          <p className="text-[10px] uppercase tracking-[0.10em] font-semibold text-fg-subtle">Plan Pro</p>
          <p className="text-[28px] font-bold text-fg leading-none">{PRECIOS.pro}</p>
          <p className="text-[13px] text-fg-muted">Todo incluido, sin límites de productos ni funciones.</p>
        </div>

        {/* CTA */}
        <Link
          href="/planes"
          className="inline-flex items-center justify-center w-full h-11 bg-fg hover:bg-fg-muted text-white text-sm font-semibold rounded-[var(--radius-full)] transition-colors"
        >
          Ver planes y solicitar upgrade
        </Link>

        <p className="text-[12px] text-fg-subtle">
          El upgrade lo activa el equipo de CValleTienda. Te confirmamos en menos de 24 hs.
        </p>
      </div>
    </div>
  )
}
