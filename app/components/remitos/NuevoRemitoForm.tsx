'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crearRemito, type CrearRemitoInput } from '@/app/actions/remitos'

interface VentaOpcion {
  id: string
  numero_ticket: number
  total: number
  cliente_nombre: string | null
  created_at: string
}

interface Props {
  ventas: VentaOpcion[]
  ventaIdPreseleccionada?: string
}

export function NuevoRemitoForm({ ventas, ventaIdPreseleccionada }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ventaId, setVentaId] = useState(ventaIdPreseleccionada ?? '')
  const [destinatario, setDestinatario]   = useState('')
  const [direccion, setDireccion]         = useState('')
  const [telefono, setTelefono]           = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [fechaEntrega, setFechaEntrega]   = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!destinatario.trim()) {
      setError('El destinatario es obligatorio.')
      return
    }
    const input: CrearRemitoInput = {
      venta_id:          ventaId || null,
      destinatario,
      direccion_entrega: direccion,
      telefono_entrega:  telefono,
      observaciones,
      fecha_entrega:     fechaEntrega,
    }
    startTransition(async () => {
      const res = await crearRemito(input)
      if ('error' in res) {
        setError(res.error)
      } else {
        router.push(`/remitos/${res.remitoId}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Venta asociada (opcional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Venta asociada <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <select
          value={ventaId}
          onChange={(e) => setVentaId(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/60"
        >
          <option value="">Sin venta asociada</option>
          {ventas.map((v) => (
            <option key={v.id} value={v.id}>
              #{v.numero_ticket} —{' '}
              {new Date(v.created_at).toLocaleDateString('es-AR')}
              {v.cliente_nombre ? ` — ${v.cliente_nombre}` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Destinatario */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Destinatario <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={destinatario}
          onChange={(e) => setDestinatario(e.target.value)}
          placeholder="Nombre o razón social"
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/60"
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Dirección */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de entrega</label>
          <input
            type="text"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Calle 123, Barrio, Ciudad"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/60"
          />
        </div>

        {/* Teléfono */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono de contacto</label>
          <input
            type="text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="+54 9 299 XXX-XXXX"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/60"
          />
        </div>
      </div>

      {/* Fecha de entrega */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha estimada de entrega</label>
        <input
          type="date"
          value={fechaEntrega}
          onChange={(e) => setFechaEntrega(e.target.value)}
          className="w-full sm:w-48 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/60"
        />
      </div>

      {/* Observaciones */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          rows={3}
          placeholder="Indicaciones especiales, horarios, etc."
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lime-400/60 resize-none"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 px-5 bg-[#0A0A0A] text-white text-sm font-semibold rounded-full hover:bg-gray-800 transition disabled:opacity-50"
        >
          {isPending ? 'Creando…' : 'Crear remito'}
        </button>
        <a
          href="/remitos"
          className="h-10 px-5 border border-gray-200 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-50 transition"
        >
          Cancelar
        </a>
      </div>
    </form>
  )
}
