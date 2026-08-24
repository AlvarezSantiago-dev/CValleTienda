import Link from 'next/link'
import type { SaldoCuenta } from '@/lib/caja/types'
import { labelTipoCuenta } from '@/lib/caja/labels'
import { formatDate } from '@/lib/format'
import { formatARS } from '@/lib/format-moneda'
import { LabelAyuda } from '@/components/caja/LabelAyuda'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { glosarioCaja } from '@/lib/caja/glosario'

interface Props {
  saldos: SaldoCuenta[]
}

export function SaldosTiendaPanel({ saldos }: Props) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="px-5 py-4 border-b border-border-subtle space-y-1">
        <h2 className="text-[15px] font-semibold text-fg">Cuentas de la tienda</h2>
        <p className="text-sm text-fg-muted">
          {glosarioCaja.saldoAlMomento} Esto <strong className="font-medium text-fg">no</strong> es el
          arqueo del cajón del turno.
        </p>
      </div>

      <div className="p-4 space-y-3">
        {saldos.length === 0 ? (
          <p className="text-sm text-fg-subtle text-center py-4">No hay cuentas activas</p>
        ) : (
          saldos.map((c) => (
            <div
              key={c.cuenta_fondo_id}
              className="rounded-[var(--radius-lg)] border border-border-subtle p-4 bg-surface-sunken/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm shrink-0 mt-1"
                    style={{ background: c.color ?? 'var(--brand-600)' }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-fg truncate">{c.nombre}</p>
                    <Badge variant="neutral" className="mt-1">
                      {labelTipoCuenta(c.tipo)}
                    </Badge>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-wide text-fg-subtle font-semibold">
                    <LabelAyuda label="Disponible" clave="saldoAlMomento" />
                  </p>
                  <p className="text-lg font-bold font-mono tabular-nums text-fg">
                    {formatARS(c.saldoAlMomento)}
                  </p>
                </div>
              </div>

              {c.porAcreditar > 0 && (
                <div className="mt-3 pt-3 border-t border-border-subtle grid gap-2 sm:grid-cols-3 text-xs text-fg-muted">
                  <div>
                    <p className="font-medium text-fg">
                      <LabelAyuda label="Por acreditar" clave="porAcreditar" />
                    </p>
                    <p className="text-danger-soft-fg font-mono tabular-nums mt-0.5">
                      {formatARS(c.porAcreditar)}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-fg">
                      <LabelAyuda label="Proyectado" clave="saldoProyectado" />
                    </p>
                    <p className="font-mono tabular-nums mt-0.5">{formatARS(c.saldoProyectado)}</p>
                  </div>
                  <div>
                    <p className="font-medium text-fg">Próxima acreditación</p>
                    <p className="mt-0.5">
                      {c.proximaFechaAcreditacion
                        ? formatDate(c.proximaFechaAcreditacion, {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        <p className="text-xs text-fg-subtle pt-1">
          Configurá cuentas en{' '}
          <Link
            href="/configuracion/cuentas-fondos"
            className="text-fg-brand hover:underline font-medium"
          >
            Configuración → Cuentas
          </Link>
          .
        </p>
      </div>
    </Card>
  )
}
