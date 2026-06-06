'use client'

import { useMemo, useState } from 'react'
import type { SaldoCuentaDashboard } from '@/lib/dashboard/queries'
import { formatARS } from '@/lib/format'

interface SaldosCardProps {
  cuentas: SaldoCuentaDashboard[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

export function SaldosCard({ cuentas }: SaldosCardProps) {
  const [selectedCuentaId, setSelectedCuentaId] = useState<string | null>(null)

  const totalPendiente = useMemo(
    () => cuentas.reduce((acc, c) => acc + c.pendientePorAcreditar, 0),
    [cuentas]
  )

  const selectedCuenta = selectedCuentaId
    ? cuentas.find((c) => c.id === selectedCuentaId) ?? null
    : null

  const pendingItems = useMemo(() => {
    return selectedCuenta ? selectedCuenta.pendientes : []
  }, [selectedCuenta])

  const closeModal = () => {
    setSelectedCuentaId(null)
  }

  if (cuentas.length === 0) {
    return null
  }

  const modalOpen = selectedCuenta !== null

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
        <div className="px-5 py-4 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-[14px] font-semibold text-gray-900">Saldos disponibles</h2>
            {totalPendiente > 0 ? (
              <p className="text-xs text-gray-500 mt-1">
                Pendiente por acreditar total: <span className="font-semibold text-gray-900">{formatARS(totalPendiente)}</span>
              </p>
            ) : null}
          </div>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cuentas.map((c) => (
            <div
              key={c.id}
              className="rounded-[1.25rem] border border-gray-100 p-4 shadow-sm bg-white"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">{c.nombre}</span>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                  style={{
                    backgroundColor: (c.color ?? '#65a30d') + '22',
                    color: c.color ?? '#65a30d',
                  }}
                >
                  {c.tipo.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[17px] font-bold text-gray-900 truncate tabular-nums">
                {formatARS(c.saldo_actual)}
              </p>
              {c.pendientePorAcreditar > 0 ? (
                <div className="mt-3 text-xs text-gray-500 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span>Disponible estimado</span>
                    <span className="font-semibold text-gray-900 tabular-nums">
                      {formatARS(c.saldoDisponibleEstimado)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span>Pendiente por acreditar</span>
                    <span className="font-semibold text-red-600 tabular-nums">
                      {formatARS(c.pendientePorAcreditar)}
                    </span>
                  </div>
                  {c.proximaFechaAcreditacion ? (
                    <div className="flex items-center justify-between gap-2">
                      <span>Próxima acreditación</span>
                      <span className="font-semibold text-gray-900">
                        {formatDate(c.proximaFechaAcreditacion)}
                        {c.pendienteFechas > 1 ? ` (+${c.pendienteFechas - 1} fechas)` : ''}
                      </span>
                    </div>
                  ) : null}
                  {c.pendienteComision > 0 ? (
                    <div className="flex items-center justify-between gap-2">
                      <span>Comisión futura</span>
                      <span className="font-semibold text-gray-900 tabular-nums">
                        {formatARS(c.pendienteComision)}
                      </span>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCuentaId(c.id)
                    }}
                    className="mt-3 inline-flex items-center justify-center h-8 w-full rounded-full border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Ver detalle de acreditación
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="w-full max-w-[min(100vw-1rem,90rem)] rounded-[1.5rem] bg-white shadow-2xl overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Detalle de acreditación pendiente
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedCuenta
                    ? `Cuenta ${selectedCuenta.nombre} · ${selectedCuenta.pendientes.length} pagos pendientes`
                    : 'Seleccioná una cuenta para ver su detalle.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="h-9 px-4 rounded-full border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cerrar
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto px-4 py-4">
              {pendingItems.length === 0 ? (
                <div className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-500">
                  No hay detalles de acreditación pendientes para esta cuenta.
                </div>
              ) : (
                <>
                  <div className="space-y-3 sm:hidden">
                    {pendingItems.map((item) => (
                      <article key={item.pagoVentaId} className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex flex-col gap-2 text-sm text-gray-700">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">Venta</span>
                            <span className="text-right text-xs text-gray-500">{item.ventaId.slice(0, 8)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                            <div>
                              <p className="font-semibold text-gray-900">Venta</p>
                              <p>{item.fechaVenta ? formatDateTime(item.fechaVenta) : '—'}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">Acredita</p>
                              <p>{formatDate(item.fechaAcreditacion)}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="font-semibold text-gray-900">Monto neto</p>
                              <p className="text-gray-900 tabular-nums">{formatARS(item.montoNeto)}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">Comisión</p>
                              <p className="text-red-600 tabular-nums">{formatARS(item.comision)}</p>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="hidden sm:block min-w-full overflow-x-auto">
                    <table className="w-full text-sm text-left border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-xs uppercase tracking-[0.12em] text-gray-500">
                        <th className="pb-2 pr-4">Venta</th>
                        <th className="pb-2 pr-4">Fecha venta</th>
                        <th className="pb-2 pr-4">Acredita</th>
                        <th className="pb-2 pr-4 text-right">Monto neto</th>
                        <th className="pb-2 pr-4 text-right">Comisión</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingItems.map((item) => (
                        <tr key={item.pagoVentaId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 pr-4 text-[13px] text-gray-700">{item.ventaId.slice(0, 8)}</td>
                          <td className="py-3 pr-4 text-[13px] text-gray-600">
                            {item.fechaVenta ? formatDateTime(item.fechaVenta) : '—'}
                          </td>
                          <td className="py-3 pr-4 text-[13px] text-gray-700">
                            {formatDate(item.fechaAcreditacion)}
                          </td>
                          <td className="py-3 pr-4 text-right font-semibold text-gray-900 tabular-nums">
                            {formatARS(item.montoNeto)}
                          </td>
                          <td className="py-3 pr-4 text-right text-red-600 tabular-nums">
                            {formatARS(item.comision)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
