'use client'

import { useEffect, useState, useTransition } from 'react'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'
import { PagoMultiMetodo, type PagoLinea } from './PagoMultiMetodo'
import { FacturaToggle } from './FacturaToggle'
import { buscarClientesAction, type ClienteLite } from '@/app/actions/ventas'
import { NuevoClienteModal } from '@/components/clientes/NuevoClienteModal'
import type { MetodoPago } from '@/lib/configuracion/queries'

interface PanelPagoProps {
  metodos: MetodoPago[]
  subtotal: number
  descuento: number
  onDescuentoChange: (v: number) => void
  pagos: PagoLinea[]
  onPagosChange: (p: PagoLinea[]) => void
  clienteSeleccionado: ClienteLite | null
  onClienteChange: (c: ClienteLite | null) => void
  observaciones: string
  onObservacionesChange: (v: string) => void
  onCobrar: () => void
  isCobrando: boolean
  puedeCobrar: boolean
  error: string | null
  saldoFavorAplicado: number
  onSaldoFavorChange: (v: number) => void
  // Facturación electrónica
  facturacionActiva?: boolean
  emitirFactura?: boolean
  onEmitirFacturaChange?: (v: boolean) => void
  cuitReceptor?: string
  onCuitReceptorChange?: (v: string) => void
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

export function PanelPago({
  metodos,
  subtotal,
  descuento,
  onDescuentoChange,
  pagos,
  onPagosChange,
  clienteSeleccionado,
  onClienteChange,
  observaciones,
  onObservacionesChange,
  onCobrar,
  isCobrando,
  puedeCobrar,
  error,
  saldoFavorAplicado,
  onSaldoFavorChange,
  facturacionActiva = false,
  emitirFactura = false,
  onEmitirFacturaChange,
  cuitReceptor = '',
  onCuitReceptorChange,
}: PanelPagoProps) {
  const total = Math.max(0, Math.round((subtotal - descuento) * 100) / 100)
  const totalAPagar = Math.max(0, Math.round((total - saldoFavorAplicado) * 100) / 100)

  function aplicarSaldoCompleto() {
    const saldoDisponible = clienteSeleccionado?.saldo_favor ?? 0
    onSaldoFavorChange(Math.min(saldoDisponible, total))
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 lg:sticky lg:top-4">
      <h2 className="text-base font-semibold text-gray-900">Cobrar</h2>

      <ClienteSelector value={clienteSeleccionado} onChange={onClienteChange} />

      {clienteSeleccionado && clienteSeleccionado.saldo_favor > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-emerald-700 font-medium">Saldo a favor disponible</span>
            <span className="font-bold text-emerald-800">
              {formatARS(clienteSeleccionado.saldo_favor)}
            </span>
          </div>
          {saldoFavorAplicado > 0 ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-emerald-600">Aplicado: <strong>{formatARS(saldoFavorAplicado)}</strong></span>
              <button
                type="button"
                onClick={() => onSaldoFavorChange(0)}
                className="text-xs text-red-500 hover:text-red-700 underline"
              >
                Quitar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={aplicarSaldoCompleto}
              className="w-full text-xs font-medium text-emerald-700 border border-emerald-300 rounded-md py-1 hover:bg-emerald-100 transition-colors"
            >
              Aplicar saldo al cobro
            </button>
          )}
        </div>
      )}

      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium text-gray-900">{formatARS(subtotal)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <label className="text-gray-600" htmlFor="descuento_global">
            Descuento
          </label>
          <input
            id="descuento_global"
            type="number"
            min={0}
            step={0.01}
            value={descuento}
            onChange={(e) =>
              onDescuentoChange(Math.max(0, Number(e.target.value) || 0))
            }
            className="w-28 h-8 px-2 border border-gray-300 rounded-md text-sm text-right focus:ring-2 focus:ring-lime-400/60"
          />
        </div>
        {saldoFavorAplicado > 0 && (
          <div className="flex justify-between text-sm text-emerald-700">
            <span>Saldo a favor</span>
            <span>- {formatARS(saldoFavorAplicado)}</span>
          </div>
        )}
        <div className="flex justify-between items-baseline pt-1 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-700">Total a pagar</span>
          <span className="text-2xl font-bold text-lime-800">{formatARS(totalAPagar)}</span>
        </div>
      </div>

      <PagoMultiMetodo
        metodos={metodos}
        pagos={pagos}
        total={totalAPagar}
        onChange={onPagosChange}
      />

      <Textarea
        label="Observaciones (opcional)"
        rows={2}
        value={observaciones}
        onChange={(e) => onObservacionesChange(e.target.value)}
      />

      {facturacionActiva && onEmitirFacturaChange && onCuitReceptorChange && (
        <FacturaToggle
          emitirFactura={emitirFactura}
          onEmitirFacturaChange={onEmitirFacturaChange}
          cuitReceptor={cuitReceptor}
          onCuitReceptorChange={onCuitReceptorChange}
        />
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <Button
        type="button"
        onClick={onCobrar}
        disabled={!puedeCobrar || isCobrando}
        className="w-full !bg-[#0A0A0A] hover:!bg-gray-800 !rounded-full !h-12 !border-transparent"
      >
        {isCobrando ? 'Cobrando…' : `Cobrar ${formatARS(totalAPagar)}`}
      </Button>
    </div>
  )
}

function ClienteSelector({
  value,
  onChange,
}: {
  value: ClienteLite | null
  onChange: (c: ClienteLite | null) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ClienteLite[]>([])
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      if (!query.trim()) {
        setResults([])
        return
      }
      startTransition(async () => {
        const res = await buscarClientesAction(query)
        if (res.ok) setResults(res.data ?? [])
      })
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  if (value) {
    const nombre = `${value.nombre}${value.apellido ? ' ' + value.apellido : ''}`.trim()
    return (
      <div className="flex items-center justify-between bg-lime-50 border border-lime-200 rounded-lg px-3 py-2 text-sm">
        <div>
          <p className="font-medium text-gray-900">{nombre}</p>
          {(value.dni || value.telefono) && (
            <p className="text-xs text-gray-500">
              {[value.dni, value.telefono].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <button
          type="button"
          className="text-xs text-indigo-700 hover:text-indigo-900 font-medium"
          onClick={() => {
            onChange(null)
            setQuery('')
            setResults([])
          }}
        >
          Quitar
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Cliente (opcional): nombre, DNI o teléfono"
          className="flex-1 h-9 px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="h-9 px-3 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-xs font-medium text-gray-700 whitespace-nowrap"
          title="Crear cliente nuevo"
        >
          + Nuevo
        </button>
      </div>
      {open && query && results.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto bg-white border border-gray-200 rounded-md shadow-lg divide-y divide-gray-100">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(c)
                  setQuery('')
                  setResults([])
                  setOpen(false)
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50"
              >
                <p className="font-medium text-gray-900">
                  {c.nombre} {c.apellido ?? ''}
                </p>
                <p className="text-xs text-gray-500">
                  {[c.dni, c.telefono].filter(Boolean).join(' · ') || '—'}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && query && !isPending && results.length === 0 && (
        <p className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-500">
          Sin resultados.
        </p>
      )}

      <NuevoClienteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialNombre={query}
        onCreated={(c) => {
          onChange({
            id: c.id,
            nombre: c.nombre,
            apellido: c.apellido,
            dni: c.dni,
            telefono: c.telefono,
            saldo_favor: 0,
          })
          setQuery('')
          setResults([])
          setOpen(false)
          setModalOpen(false)
        }}
      />
    </div>
  )
}
