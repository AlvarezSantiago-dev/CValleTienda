'use client'

import { useState } from 'react'
import type { Cierre } from '@/lib/caja/queries'
import type { ResumenTurno } from '@/lib/caja/types'
import { labelTipoCuenta } from '@/lib/caja/labels'
import { formatARS } from '@/lib/format-moneda'

interface Props {
  resumen: ResumenTurno
  modo: 'preview' | 'cerrado'
  cierre?: Cierre
  /** Ocultar desglose por cuenta (cajero al cerrar) */
  mostrarDesgloseCuentas?: boolean
  /** Ocultar cobros por cuenta */
  mostrarPagosPorCuenta?: boolean
  colapsable?: boolean
  compacto?: boolean
}

export function ResumenTurnoPanel({
  resumen,
  modo,
  cierre,
  mostrarDesgloseCuentas = true,
  mostrarPagosPorCuenta = true,
  colapsable = false,
  compacto = false,
}: Props) {
  const [expandido, setExpandido] = useState(!colapsable)

  const dif = cierre?.diferencia_efectivo ?? null
  const difTone =
    dif == null
      ? 'text-gray-700'
      : dif === 0
        ? 'text-lime-700'
        : dif > 0
          ? 'text-gray-900'
          : 'text-red-600'

  const contenido = (
    <div className={compacto ? 'space-y-4' : 'space-y-5'}>
      {modo === 'preview' && (
        <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          Vista previa del cierre
        </span>
      )}

      <div className={`grid gap-3 ${compacto ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'}`}>
        <Kpi label="Ventas" value={String(resumen.total_ventas_cantidad)} hint={formatARS(resumen.total_ventas_monto)} />
        <Kpi
          label="Devoluciones"
          value={String(resumen.total_devoluciones_cantidad)}
          hint={
            resumen.total_devoluciones_credito > 0
              ? `${formatARS(resumen.total_devoluciones_monto)} · Reintegros ${formatARS(resumen.total_devoluciones_reintegro)} · Créditos ${formatARS(resumen.total_devoluciones_credito)}`
              : formatARS(resumen.total_devoluciones_monto)
          }
        />
        <Kpi label="Comisiones" value={formatARS(resumen.total_comisiones)} />
        <Kpi label="Total neto" value={formatARS(resumen.total_neto)} highlight />
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-amber-800 mb-3">
          Arqueo de efectivo
        </h3>
        <div className={`grid gap-3 ${modo === 'cerrado' && cierre ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1'}`}>
          <MiniCell label="Apertura" value={formatARS(resumen.monto_apertura_efectivo)} />
          <MiniCell label="Esperado en cajón" value={formatARS(resumen.efectivo_esperado)} strong />
          {modo === 'cerrado' && cierre && (
            <>
              <MiniCell
                label="Declarado"
                value={
                  cierre.efectivo_declarado != null ? formatARS(cierre.efectivo_declarado) : '—'
                }
              />
              <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 sm:col-span-3">
                <p className="text-xs text-gray-500">Diferencia</p>
                <p className={`text-[15px] font-semibold tabular-nums ${difTone}`}>
                  {dif == null ? '—' : formatARS(dif)}
                </p>
                {dif != null && dif !== 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">{dif > 0 ? 'Sobrante' : 'Faltante'}</p>
                )}
              </div>
            </>
          )}
        </div>
        {modo === 'preview' && (
          <p className="text-xs text-amber-800 mt-2">
            Calculado: apertura + ingresos en efectivo − egresos en efectivo del turno.
          </p>
        )}
      </div>

      {mostrarDesgloseCuentas && (
        <section>
          <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-gray-400 mb-2">
            Movimiento del turno por cuenta
          </h3>
          {resumen.detalle_por_cuenta.length === 0 ? (
            <p className="text-[13px] text-gray-400 italic">No hubo movimientos en cuentas en este turno.</p>
          ) : (
            <div className="rounded-xl border border-gray-100 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 text-left">
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
                <tbody className="divide-y divide-gray-50">
                  {resumen.detalle_por_cuenta.map((d) => (
                    <tr key={d.cuenta_fondo_id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 text-[13px] font-medium text-gray-900">{d.nombre_cuenta}</td>
                      <td className="px-3 py-2.5">
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                          {labelTipoCuenta(d.tipo_cuenta)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-[13px] text-lime-700 tabular-nums">
                        {formatARS(d.total_ingresos)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[13px] text-red-600 tabular-nums">
                        {d.total_egresos > 0 ? `−${formatARS(d.total_egresos)}` : formatARS(0)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[13px] text-gray-500 tabular-nums">
                        {formatARS(d.comision_estimada)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[13px] font-semibold text-gray-900 tabular-nums">
                        {formatARS(d.total_neto)}
                      </td>
                      {!compacto && (
                        <>
                          <td className="px-3 py-2.5 text-right text-[12px] text-gray-500 tabular-nums">
                            {formatARS(d.saldo_antes_turno)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-[12px] text-gray-700 tabular-nums">
                            {formatARS(d.saldo_despues_turno)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {mostrarPagosPorCuenta && resumen.pagos_por_cuenta.length > 0 && (
        <section>
          <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-gray-400 mb-2">
            Cobros por cuenta
          </h3>
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 text-left">
                  <th className="px-3 py-2.5">Cuenta</th>
                  <th className="px-3 py-2.5 text-right">Pagos</th>
                  <th className="px-3 py-2.5 text-right">Bruto</th>
                  <th className="px-3 py-2.5 text-right">Comisión</th>
                  <th className="px-3 py-2.5 text-right">Neto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {resumen.pagos_por_cuenta.map((p) => (
                  <tr key={p.nombre_cuenta} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 text-[13px] text-gray-900">{p.nombre_cuenta}</td>
                    <td className="px-3 py-2.5 text-right text-[13px] tabular-nums">{p.cantidad_pagos}</td>
                    <td className="px-3 py-2.5 text-right text-[13px] tabular-nums">{formatARS(p.monto_bruto)}</td>
                    <td className="px-3 py-2.5 text-right text-[13px] text-gray-500 tabular-nums">
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
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-[13px] font-semibold text-gray-900">Resumen del turno</span>
        <span className="text-gray-400 text-sm">{expandido ? '▾' : '▸'}</span>
      </button>
      {expandido && <div className="px-4 pb-4 border-t border-gray-50">{contenido}</div>}
    </div>
  )
}

function Kpi({
  label,
  value,
  hint,
  highlight,
}: {
  label: string
  value: string
  hint?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        highlight ? 'border-lime-200 bg-lime-50' : 'border-gray-200 bg-white'
      }`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-base font-semibold tabular-nums ${highlight ? 'text-lime-800' : 'text-gray-900'}`}>
        {value}
      </p>
      {hint && <p className="text-xs text-gray-400 mt-0.5 tabular-nums">{hint}</p>}
    </div>
  )
}

function MiniCell({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-white px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-[15px] tabular-nums ${strong ? 'font-bold text-amber-900' : 'font-semibold text-gray-900'}`}>
        {value}
      </p>
    </div>
  )
}
