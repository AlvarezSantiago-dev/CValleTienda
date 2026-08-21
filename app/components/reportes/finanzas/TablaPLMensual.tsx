'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import type { FilaMesReporte, TotalesReporte } from '@/lib/reportes/queries'
import { esMesConActividad } from '@/lib/reportes/formulas'
import { formatARS } from '@/lib/format'
import { ColorMonto, DesglosePL, MargenBadge } from './DesglosePL'
import { TablaPLMensualMobile } from './TablaPLMensualMobile'

function FilaResumen({
  f,
  mostrarCostos,
  abierto,
  onToggle,
}: {
  f: FilaMesReporte
  mostrarCostos: boolean
  abierto: boolean
  onToggle: () => void
}) {
  const id = `pl-row-${f.anio}-${f.mes}`
  return (
    <Fragment>
      <tr className="border-b border-border-subtle hover:bg-surface-hover">
        <td className="px-3 py-2 w-10">
          <button
            type="button"
            aria-expanded={abierto}
            aria-controls={id}
            onClick={onToggle}
            className="inline-flex items-center justify-center size-8 rounded-[var(--radius-md)] text-fg-muted hover:bg-surface-sunken hover:text-fg"
          >
            <ChevronDown
              className={`size-4 transition-transform ${abierto ? 'rotate-180' : ''}`}
              aria-hidden
            />
            <span className="sr-only">{abierto ? 'Ocultar' : 'Ver'} desglose de {f.mesLabel}</span>
          </button>
        </td>
        <td className="px-3 py-2.5 text-sm font-medium text-fg whitespace-nowrap">{f.mesLabel}</td>
        <td className="px-3 py-2.5 text-sm text-right text-fg-muted tabular-nums">{f.cantidadVentas}</td>
        <td className="px-3 py-2.5 text-sm text-right font-semibold text-fg tabular-nums">{formatARS(f.ventasNetas)}</td>
        {mostrarCostos && (
          <td className="px-3 py-2.5 text-right">
            {f.tieneCostos && f.margenPct != null
              ? <MargenBadge pct={f.margenPct} />
              : <span className="text-fg-subtle text-xs">—</span>}
          </td>
        )}
        <td className="px-3 py-2.5 text-sm text-right tabular-nums">
          <ColorMonto value={f.resultadoNeto} className="font-semibold" />
        </td>
      </tr>
      {abierto && (
        <tr className="border-b border-border-subtle bg-surface-sunken/50">
          <td colSpan={mostrarCostos ? 6 : 5} className="px-3 py-4" id={id}>
            <DesglosePL m={f} mostrarCostos={mostrarCostos} />
          </td>
        </tr>
      )}
    </Fragment>
  )
}

interface TablaPLMensualProps {
  filas: FilaMesReporte[]
  totales: TotalesReporte
  mostrarCostos: boolean
}

export function TablaPLMensual({ filas, totales, mostrarCostos }: TablaPLMensualProps) {
  const filasVisibles = filas.filter(esMesConActividad)
  const ocultos = filas.length - filasVisibles.length
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({})
  const [totalAbierto, setTotalAbierto] = useState(false)

  if (filasVisibles.length === 0) {
    return (
      <div className="bg-surface border border-dashed border-border-default rounded-[var(--radius-lg)] py-16 text-center">
        <p className="text-fg-subtle text-sm">Sin ventas, devoluciones ni egresos en el período seleccionado.</p>
      </div>
    )
  }

  function toggle(key: string) {
    setAbiertos((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const colCount = mostrarCostos ? 6 : 5

  return (
    <div>
      {!mostrarCostos && (
        <div className="mb-5 flex items-start gap-2 bg-warning-soft border border-warning-border rounded-[var(--radius-md)] px-4 py-3">
          <p className="text-xs text-warning-soft-fg">
            Costo, ganancia bruta y margen no se muestran porque aún no cargaste precios de costo.
            {' '}
            <Link href="/productos" className="font-semibold underline">Ir a Productos →</Link>
          </p>
        </div>
      )}

      <TablaPLMensualMobile filas={filasVisibles} totales={totales} mostrarCostos={mostrarCostos} />

      <div className="hidden lg:block bg-surface border border-border-subtle rounded-[var(--radius-lg)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem]">
            <thead>
              <tr className="bg-surface-sunken border-b border-border-subtle">
                <th className="w-10 px-2" />
                <th className="px-3 py-3 text-left text-xs font-semibold text-fg-muted uppercase tracking-wide">Mes</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-fg-muted uppercase tracking-wide">Tickets</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-fg-muted uppercase tracking-wide whitespace-nowrap">Ventas netas</th>
                {mostrarCostos && (
                  <th className="px-3 py-3 text-right text-xs font-semibold text-fg-muted uppercase tracking-wide">Margen</th>
                )}
                <th className="px-3 py-3 text-right text-xs font-semibold text-fg-muted uppercase tracking-wide whitespace-nowrap">Resultado neto</th>
              </tr>
            </thead>
            <tbody>
              {filasVisibles.map((f) => {
                const key = `${f.anio}-${f.mes}`
                return (
                  <FilaResumen
                    key={key}
                    f={f}
                    mostrarCostos={mostrarCostos}
                    abierto={!!abiertos[key]}
                    onToggle={() => toggle(key)}
                  />
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-surface-sunken font-semibold border-t-2 border-border-default">
                <td className="px-3 py-2 w-10">
                  <button
                    type="button"
                    aria-expanded={totalAbierto}
                    onClick={() => setTotalAbierto((v) => !v)}
                    className="inline-flex items-center justify-center size-8 rounded-[var(--radius-md)] text-fg-muted hover:bg-surface hover:text-fg"
                  >
                    <ChevronDown
                      className={`size-4 transition-transform ${totalAbierto ? 'rotate-180' : ''}`}
                      aria-hidden
                    />
                    <span className="sr-only">{totalAbierto ? 'Ocultar' : 'Ver'} desglose del total</span>
                  </button>
                </td>
                <td className="px-3 py-3 text-xs text-fg uppercase tracking-wide">Total</td>
                <td className="px-3 py-3 text-sm text-right text-fg tabular-nums">{totales.cantidadVentas}</td>
                <td className="px-3 py-3 text-sm text-right text-fg tabular-nums">{formatARS(totales.ventasNetas)}</td>
                {mostrarCostos && (
                  <td className="px-3 py-3 text-right">
                    {totales.margenPct != null ? <MargenBadge pct={totales.margenPct} /> : <span className="text-fg-subtle">—</span>}
                  </td>
                )}
                <td className="px-3 py-3 text-sm text-right tabular-nums">
                  <ColorMonto value={totales.resultadoNeto} className="font-bold" />
                </td>
              </tr>
              {totalAbierto && (
                <tr className="bg-surface-sunken/50">
                  <td colSpan={colCount} className="px-3 py-4">
                    <DesglosePL m={totales} mostrarCostos={mostrarCostos} />
                  </td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
        <p className="px-3 py-2 text-xs text-fg-subtle border-t border-border-subtle">
          Tocá la flecha de un mes para ver brutas, cobrado, devoluciones, crédito y egresos.
        </p>
      </div>

      {ocultos > 0 && (
        <p className="mt-2 text-xs text-fg-subtle">
          Se ocultan {ocultos} {ocultos === 1 ? 'mes' : 'meses'} sin movimiento.
        </p>
      )}

      <p className="mt-4 text-xs text-fg-subtle leading-relaxed">
        <strong>Ventas netas</strong> = brutas − reembolso − crédito otorgado (mercadería).
        {' '}<strong>Cobrado</strong> = brutas − crédito usado (plata que ingresó).
        {' '}El crédito usado <strong>no borra</strong> la devolución.
        {' '}&nbsp;·&nbsp; <strong>Resultado neto:</strong> ganancia bruta − comisiones − egresos.
        No es el disponible de Efectivo / MP / banco (eso está en Inicio y en Caja).
      </p>
    </div>
  )
}
