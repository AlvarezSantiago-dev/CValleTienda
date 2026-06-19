'use client'

import { useState } from 'react'
import { ClienteBusquedaInline } from './ClienteBusquedaInline'
import { NuevoClienteModal } from '@/components/clientes/NuevoClienteModal'
import type { ClienteLite } from '@/app/actions/ventas'
import { formatARS } from '@/lib/format'

type ModoCliente = 'ninguno' | 'buscar' | 'nuevo'

interface PasoClienteProps {
  cliente: ClienteLite | null
  onClienteChange: (c: ClienteLite | null) => void
  saldoFavorAplicado: number
  onSaldoFavorChange: (v: number) => void
  totalBruto: number
}

export function PasoCliente({
  cliente,
  onClienteChange,
  saldoFavorAplicado,
  onSaldoFavorChange,
  totalBruto,
}: PasoClienteProps) {
  const [modo, setModo] = useState<ModoCliente>(cliente ? 'buscar' : 'ninguno')
  const [modalNuevo, setModalNuevo] = useState(false)

  function elegirNinguno() {
    setModo('ninguno')
    onClienteChange(null)
    onSaldoFavorChange(0)
  }

  function elegirBuscar() {
    setModo('buscar')
  }

  function elegirNuevo() {
    setModo('nuevo')
    setModalNuevo(true)
  }

  const opciones: { id: ModoCliente; label: string; sub: string }[] = [
    { id: 'ninguno', label: 'Sin cliente', sub: 'Consumidor final' },
    { id: 'buscar', label: 'Buscar', sub: 'Nombre, DNI o teléfono' },
    { id: 'nuevo', label: 'Cliente nuevo', sub: 'Alta rápida' },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900">¿Asociar cliente a la venta?</h3>
        <p className="text-sm text-gray-500 mt-2">Opcional — podés continuar sin cliente</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Opciones de cliente">
        {opciones.map((op) => {
          const activo =
            op.id === 'ninguno'
              ? modo === 'ninguno' && !cliente
              : op.id === 'buscar'
                ? modo === 'buscar' || !!cliente
                : modo === 'nuevo'
          return (
            <button
              key={op.id}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => {
                if (op.id === 'ninguno') elegirNinguno()
                else if (op.id === 'buscar') elegirBuscar()
                else elegirNuevo()
              }}
              className={[
                'min-h-[80px] rounded-xl border-2 p-4 text-left transition-colors',
                activo
                  ? 'border-lime-500 bg-lime-50'
                  : 'border-gray-200 bg-white hover:border-gray-300',
              ].join(' ')}
            >
              <p className="text-base font-bold text-gray-900">{op.label}</p>
              <p className="text-sm text-gray-500 mt-1">{op.sub}</p>
            </button>
          )
        })}
      </div>

      {(modo === 'buscar' || cliente) && (
        <div className="max-w-lg mx-auto w-full">
          <ClienteBusquedaInline value={cliente} onChange={onClienteChange} />
        </div>
      )}

      {cliente && cliente.saldo_favor > 0 && (
        <div className="max-w-lg mx-auto w-full bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-emerald-800">Saldo a favor disponible</span>
            <span className="text-lg font-bold text-emerald-900 tabular-nums">
              {formatARS(cliente.saldo_favor)}
            </span>
          </div>
          {saldoFavorAplicado > 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-emerald-700">
                Aplicado: <strong>{formatARS(saldoFavorAplicado)}</strong>
              </span>
              <button
                type="button"
                onClick={() => onSaldoFavorChange(0)}
                className="text-sm text-red-600 font-medium underline"
              >
                Quitar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                onSaldoFavorChange(Math.min(cliente.saldo_favor, totalBruto))
              }
              className="w-full min-h-[48px] rounded-xl text-base font-semibold text-emerald-800 border-2 border-emerald-300 hover:bg-emerald-100 transition-colors"
            >
              Usar saldo a favor en esta venta
            </button>
          )}
        </div>
      )}

      <NuevoClienteModal
        open={modalNuevo}
        onClose={() => setModalNuevo(false)}
        onCreated={(c) => {
          onClienteChange({
            id: c.id,
            nombre: c.nombre,
            apellido: c.apellido,
            dni: c.dni,
            telefono: c.telefono,
            saldo_favor: 0,
          })
          setModo('buscar')
          setModalNuevo(false)
        }}
      />
    </div>
  )
}
