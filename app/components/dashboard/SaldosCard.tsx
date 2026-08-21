import type { SaldoCuentaDashboard } from '@/lib/dashboard/queries'
import { formatARS } from '@/lib/format'
import { DashboardSectionCard } from './DashboardSectionCard'

interface SaldosCardProps {
  cuentas: SaldoCuentaDashboard[]
}

const COLOR_FALLBACK = '#65a30d'

function hexSeguro(color: string | null): string {
  const raw = (color ?? '').trim()
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return raw
  return COLOR_FALLBACK
}

function hexARgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.slice(1)
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function estiloBilletera(color: string | null) {
  const hex = hexSeguro(color)
  const { r, g, b } = hexARgb(hex)
  return {
    background: `rgba(${r}, ${g}, ${b}, 0.16)`,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.45)`,
    boxShadow: `inset 0 3px 0 ${hex}`,
  }
}

export function SaldosCard({ cuentas }: SaldosCardProps) {
  if (cuentas.length === 0) return null

  const totalAlMomento = cuentas.reduce((acc, c) => acc + c.saldoAlMomento, 0)

  return (
    <DashboardSectionCard
      title="Disponible"
      description="Lo que hay ahora en cada cuenta. El color es el de Configuración → Cobros."
      action={{ label: 'Ir a Caja', href: '/caja' }}
      padding="md"
    >
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {cuentas.map((c) => {
          const hex = hexSeguro(c.color)
          return (
            <div
              key={c.id}
              className="rounded-[var(--radius-lg)] border p-4 min-w-0"
              style={estiloBilletera(c.color)}
            >
              <div className="flex items-center gap-2 min-w-0 mb-3">
                <span
                  className="size-2.5 rounded-full shrink-0 ring-2 ring-white/80"
                  style={{ background: hex }}
                  aria-hidden
                />
                <p className="text-sm font-semibold text-fg truncate">{c.nombre}</p>
              </div>
              <p className="text-xs text-fg-muted mb-0.5">Disponible</p>
              <p className="text-lg font-bold text-fg font-mono tabular-nums leading-tight break-words">
                {formatARS(c.saldoAlMomento)}
              </p>
            </div>
          )
        })}
      </div>
      <p className="mt-4 text-sm text-fg-secondary">
        Total:{' '}
        <span className="font-semibold text-fg font-mono tabular-nums">{formatARS(totalAlMomento)}</span>
      </p>
    </DashboardSectionCard>
  )
}
