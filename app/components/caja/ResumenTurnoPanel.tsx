'use client'

import { useState } from 'react'
import type { Cierre } from '@/lib/caja/queries'
import type { ResumenTurno } from '@/lib/caja/types'
import { labelTipoCuenta } from '@/lib/caja/labels'
import { formatARS } from '@/lib/format-moneda'
import { ArqueoEfectivoCard } from '@/components/caja/ArqueoEfectivoCard'
import { MetricasTurnoStrip } from '@/components/caja/MetricasTurnoStrip'
import { LabelAyuda } from '@/components/caja/LabelAyuda'
import { Badge } from '@/components/ui/Badge'

interface Props {
  resumen: ResumenTurno
  modo: 'preview' | 'cerrado'
  cierre?: Cierre
  mostrarDesgloseCuentas?: boolean
  mostrarPagosPorCuenta?: boolean
  colapsable?: boolean
  compacto?: boolean
  /** Solo tablas de desglose (sin KPIs ni arqueo) — evita duplicar en el cierre */
  soloDesgloses?: boolean
}

export function ResumenTurnoPanel({
  resumen,
  modo,
  cierre,
  mostrarDesgloseCuentas = true,
  mostrarPagosPorCuenta = true,
  colapsable = false,
  compacto = false,
  soloDesgloses = false,
}: Props) {
  const [expandido, setExpandido] = useState(!colapsable)

  const contenido = (
    <div className={compacto ? 'space-y-4' : 'space-y-5'}>
      {!soloDesgloses && modo === 'preview' && <Badge variant="info">Vista previa del cierre</Badge>}

      {!soloDesgloses && <MetricasTurnoStrip resumen={resumen} />}

      {!soloDesgloses && (
        <ArqueoEfectivoCard
          apertura={resumen.monto_apertura_efectivo}
          esperado={resumen.efectivo_esperado}
          redondeo={resumen.total_redondeo_efectivo}
          declarado={modo === 'cerrado' ? (cierre?.efectivo_declarado ?? null) : null}
          diferencia={modo === 'cerrado' ? (cierre?.diferencia_efectivo ?? null) : null}
          modo={modo === 'cerrado' ? 'cerrado' : 'preview'}
        />
      )}

      {mostrarDesgloseCuentas && (
        <section>
          <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-fg-subtle mb-2">
            <LabelAyuda label="Movimiento del turno por cuenta" clave="movimientoPorCuenta" />
          </h3>
          {resumen.detalle_por_cuenta.length === 0 ? (
            <p className="text-[13px] text-fg-subtle italic">
              No hubo movimientos en cuentas en este turno.
            </p>
          ) : (
            <>
              <ul className="md:hidden space-y-2">
                {resumen.detalle_por_cuenta.map((d) => (
                  <li
                    key={d.cuenta_fondo_id}
                    className="rounded-[var(--radius-lg)] border border-border-subtle p-3 space-y-1"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="text-[13px] font-medium text-fg">{d.nombre_cuenta}</span>
                      <span className="text-[13px] font-semibold tabular-nums">
                        {formatARS(d.total_neto)}
                      </span>
                    </div>
                    <p className="text-[11px] text-fg-muted">
                      {labelTipoCuenta(d.tipo_cuenta)} · In {formatARS(d.total_ingresos)} · Eg −
                      {formatARS(d.total_egresos)}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block rounded-[var(--radius-lg)] border border-border-subtle overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-surface-sunken">
                    <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-fg-subtle text-left">
                      <th className="px-3 py-2.5">Cuenta</th>
                      <th className="px-3 py-2.5">Tipo</th>
                      <th className="px-3 py-2.5 text-right">Ingresos</th>
                      <th className="px-3 py-2.5 text-right">Egresos</th>
                      <th className="px-3 py-2.5 text-right">Comisión</th>
                      <th className="px-3 py-2.5 text-right">Neto</th>
                      {!compacto && (
                        <>
                          <th className="px-3 py-2.5 text-right">Antes</th>
                          <th className="px-3 py-2.5 text-right">Después</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {resumen.detalle_por_cuenta.map((d) => (
                      <tr key={d.cuenta_fondo_id} className="hover:bg-surface-hover">
                        <td className="px-3 py-2.5 text-[13px] font-medium text-fg">
                          {d.nombre_cuenta}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-fg-muted">
                            {labelTipoCuenta(d.tipo_cuenta)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-[13px] text-fg-brand tabular-nums">
                          {formatARS(d.total_ingresos)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-[13px] text-danger-soft-fg tabular-nums">
                          {d.total_egresos > 0 ? `−${formatARS(d.total_egresos)}` : formatARS(0)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-[13px] text-fg-muted tabular-nums">
                          {formatARS(d.comision_estimada)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-[13px] font-semibold text-fg tabular-nums">
                          {formatARS(d.total_neto)}
                        </td>
                        {!compacto && (
                          <>
                            <td className="px-3 py-2.5 text-right text-[12px] text-fg-muted tabular-nums">
                              {formatARS(d.saldo_antes_turno)}
                            </td>
                            <td className="px-3 py-2.5 text-right text-[12px] text-fg tabular-nums">
                              {formatARS(d.saldo_despues_turno)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {mostrarPagosPorCuenta && resumen.pagos_por_cuenta.length > 0 && (
        <section>
          <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-fg-subtle mb-2">
            <LabelAyuda label="Cobros por cuenta" clave="cobrosPorCuenta" />
          </h3>
          <ul className="md:hidden space-y-2">
            {resumen.pagos_por_cuenta.map((p) => (
              <li
                key={p.nombre_cuenta}
                className="rounded-[var(--radius-lg)] border border-border-subtle p-3 flex justify-between gap-2"
              >
                <div>
                  <p className="text-[13px] font-medium text-fg">{p.nombre_cuenta}</p>
                  <p className="text-[11px] text-fg-muted">{p.cantidad_pagos} pagos</p>
                </div>
                <p className="text-[13px] font-semibold tabular-nums">{formatARS(p.monto_neto)}</p>
              </li>
            ))}
          </ul>
          <div className="hidden md:block rounded-[var(--radius-lg)] border border-border-subtle overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-surface-sunken">
                <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-fg-subtle text-left">
                  <th className="px-3 py-2.5">Cuenta</th>
                  <th className="px-3 py-2.5 text-right">Pagos</th>
                  <th className="px-3 py-2.5 text-right">Bruto</th>
                  <th className="px-3 py-2.5 text-right">Comisión</th>
                  <th className="px-3 py-2.5 text-right">Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {resumen.pagos_por_cuenta.map((p) => (
                  <tr key={p.nombre_cuenta} className="hover:bg-surface-hover">
                    <td className="px-3 py-2.5 text-[13px] text-fg">{p.nombre_cuenta}</td>
                    <td className="px-3 py-2.5 text-right text-[13px] tabular-nums">
                      {p.cantidad_pagos}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[13px] tabular-nums">
                      {formatARS(p.monto_bruto)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[13px] text-fg-muted tabular-nums">
                      {formatARS(p.comision)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[13px] font-semibold tabular-nums">
                      {formatARS(p.monto_neto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )

  if (!colapsable) return contenido

  return (
    <div className="rounded-[var(--radius-lg)] border border-border-subtle overflow-hidden">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-hover transition-colors min-h-11"
      >
        <span className="text-[13px] font-semibold text-fg">Resumen del turno</span>
        <span className="text-fg-subtle text-sm">{expandido ? '▾' : '▸'}</span>
      </button>
      {expandido && <div className="px-4 pb-4 border-t border-border-subtle">{contenido}</div>}
    </div>
  )
}
