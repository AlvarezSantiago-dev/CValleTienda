'use client'

import { useMemo, useState } from 'react'
import type { SaldoCuentaDashboard } from '@/lib/dashboard/queries'
import { formatARS, formatDate, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { DashboardSectionCard } from './DashboardSectionCard'

interface SaldosCardProps {
  cuentas: SaldoCuentaDashboard[]
}

export function SaldosCard({ cuentas }: SaldosCardProps) {
  const [selectedCuentaId, setSelectedCuentaId] = useState<string | null>(null)

  const totalPendiente = useMemo(
    () => cuentas.reduce((acc, c) => acc + c.pendientePorAcreditar, 0),
    [cuentas]
  )

  const selectedCuenta = selectedCuentaId
    ? (cuentas.find((c) => c.id === selectedCuentaId) ?? null)
    : null

  const pendingItems = selectedCuenta?.pendientes ?? []

  if (cuentas.length === 0) return null

  return (
    <>
      <DashboardSectionCard
        title="Saldos disponibles"
        description={
          totalPendiente > 0
            ? `Pendiente por acreditar total: ${formatARS(totalPendiente)}`
            : undefined
        }
        padding="md"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {cuentas.map((c) => (
            <div
              key={c.id}
              className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface p-4 shadow-xs"
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className="text-xs text-fg-muted truncate">{c.nombre}</span>
                <Badge variant="neutral" className="shrink-0 capitalize">
                  {c.tipo.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-lg font-bold text-fg truncate font-mono tabular-nums">
                {formatARS(c.saldo_actual)}
              </p>
              {c.pendientePorAcreditar > 0 && (
                <div className="mt-3 text-xs text-fg-muted space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span>Disponible estimado</span>
                    <span className="font-semibold text-fg font-mono tabular-nums">
                      {formatARS(c.saldoDisponibleEstimado)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Pendiente por acreditar</span>
                    <span className="font-semibold text-danger-soft-fg font-mono tabular-nums">
                      {formatARS(c.pendientePorAcreditar)}
                    </span>
                  </div>
                  {c.proximaFechaAcreditacion && (
                    <div className="flex items-center justify-between gap-2">
                      <span>Próxima acreditación</span>
                      <span className="font-semibold text-fg">
                        {formatDate(c.proximaFechaAcreditacion)}
                        {c.pendienteFechas > 1 ? ` (+${c.pendienteFechas - 1})` : ''}
                      </span>
                    </div>
                  )}
                  {c.pendienteComision > 0 && (
                    <div className="flex items-center justify-between gap-2">
                      <span>Comisión futura</span>
                      <span className="font-semibold text-fg font-mono tabular-nums">
                        {formatARS(c.pendienteComision)}
                      </span>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full"
                    onClick={() => setSelectedCuentaId(c.id)}
                  >
                    Ver detalle de acreditación
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </DashboardSectionCard>

      <Modal
        open={!!selectedCuenta}
        onClose={() => setSelectedCuentaId(null)}
        title="Detalle de acreditación pendiente"
        description={
          selectedCuenta
            ? `Cuenta ${selectedCuenta.nombre} · ${selectedCuenta.pendientes.length} pagos pendientes`
            : undefined
        }
        size="xl"
        footer={
          <Button variant="secondary" onClick={() => setSelectedCuentaId(null)}>
            Cerrar
          </Button>
        }
      >
        {pendingItems.length === 0 ? (
          <p className="text-sm text-fg-subtle text-center py-6">
            No hay detalles de acreditación pendientes para esta cuenta.
          </p>
        ) : (
          <>
            <ul className="space-y-3 sm:hidden">
              {pendingItems.map((item) => (
                <li
                  key={item.pagoVentaId}
                  className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface-sunken p-4 space-y-2 text-sm"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-fg">Venta</span>
                    <span className="font-mono text-xs text-fg-subtle">
                      {item.ventaId.slice(0, 8)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-fg-muted">
                    <div>
                      <p className="font-medium text-fg">Venta</p>
                      <p>{item.fechaVenta ? formatDateTime(item.fechaVenta) : '—'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-fg">Acredita</p>
                      <p>{formatDate(item.fechaAcreditacion)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-fg">Monto neto</p>
                      <p className="font-mono tabular-nums text-fg">{formatARS(item.montoNeto)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-fg">Comisión</p>
                      <p className="font-mono tabular-nums text-danger-soft-fg">
                        {formatARS(item.comision)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-fg-subtle border-b border-border-subtle">
                    <th className="pb-2 pr-4 font-semibold">Venta</th>
                    <th className="pb-2 pr-4 font-semibold">Fecha venta</th>
                    <th className="pb-2 pr-4 font-semibold">Acredita</th>
                    <th className="pb-2 pr-4 font-semibold text-right">Monto neto</th>
                    <th className="pb-2 font-semibold text-right">Comisión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {pendingItems.map((item) => (
                    <tr key={item.pagoVentaId} className="hover:bg-surface-hover">
                      <td className="py-2.5 pr-4 font-mono text-xs text-fg-secondary">
                        {item.ventaId.slice(0, 8)}
                      </td>
                      <td className="py-2.5 pr-4 text-fg-muted">
                        {item.fechaVenta ? formatDateTime(item.fechaVenta) : '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-fg-secondary">
                        {formatDate(item.fechaAcreditacion)}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-semibold text-fg font-mono tabular-nums">
                        {formatARS(item.montoNeto)}
                      </td>
                      <td className="py-2.5 text-right text-danger-soft-fg font-mono tabular-nums">
                        {formatARS(item.comision)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
