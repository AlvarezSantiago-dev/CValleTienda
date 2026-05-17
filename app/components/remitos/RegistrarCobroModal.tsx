'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { registrarCobroRemito } from '@/app/actions/remitos'

interface Props {
  remitoId: string
  montoTotal: number
  montoCobrado: number
  onClose: () => void
  onSuccess: () => void
}

function formatMoney(n: number) {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2 })
}

export function RegistrarCobroModal({ remitoId, montoTotal, montoCobrado, onClose, onSuccess }: Props) {
  const saldo = montoTotal - montoCobrado
  const today = new Date().toISOString().split('T')[0]

  const [monto, setMonto]   = useState(saldo > 0 ? saldo : montoTotal)
  const [fecha, setFecha]   = useState(today)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (monto <= 0) {
      toast.error('El monto debe ser mayor a cero.')
      return
    }
    startTransition(async () => {
      const res = await registrarCobroRemito(remitoId, monto, fecha)
      if ('error' in res) {
        toast.error(res.error ?? 'Error al registrar el cobro.')
      } else {
        toast.success('Cobro registrado correctamente.')
        onSuccess()
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0A0A0A]">Registrar cobro</h2>
            <p className="text-sm text-gray-400 mt-0.5">Remito a cobrar</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Resumen de deuda */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Total</span>
            <span>${formatMoney(montoTotal)}</span>
          </div>
          {montoCobrado > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>Ya cobrado</span>
              <span>${formatMoney(montoCobrado)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-[#0A0A0A] pt-1 border-t border-gray-200">
            <span>Saldo pendiente</span>
            <span>${formatMoney(saldo > 0 ? saldo : montoTotal)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto a cobrar</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/60"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de cobro</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/60"
              required
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 h-10 bg-[#0A0A0A] text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition disabled:opacity-50"
            >
              {isPending ? 'Guardando…' : 'Registrar cobro'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 border border-gray-200 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
