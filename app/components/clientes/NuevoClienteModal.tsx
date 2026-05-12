'use client'

import { useEffect, useState, useTransition } from 'react'
import { Input } from '@/components/ui/Input'
import { crearCliente } from '@/app/actions/clientes'

export interface ClienteCreado {
  id: string
  nombre: string
  apellido: string | null
  dni: string | null
  telefono: string | null
}

interface NuevoClienteModalProps {
  open: boolean
  onClose: () => void
  onCreated: (cliente: ClienteCreado) => void
  /** Prellenar el campo nombre */
  initialNombre?: string
}

export function NuevoClienteModal({
  open,
  onClose,
  onCreated,
  initialNombre = '',
}: NuevoClienteModalProps) {
  const [nombre, setNombre] = useState(initialNombre)
  const [apellido, setApellido] = useState('')
  const [dni, setDni] = useState('')
  const [telefono, setTelefono] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) {
      setNombre(initialNombre)
      setApellido('')
      setDni('')
      setTelefono('')
      setError(null)
    }
  }, [open, initialNombre])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await crearCliente({ nombre, apellido, dni, telefono })
      if (!res.ok || !res.data) {
        setError(res.error ?? 'Error desconocido')
        return
      }
      onCreated({
        id: res.data.id,
        nombre: nombre.trim(),
        apellido: apellido.trim() || null,
        dni: dni.trim() || null,
        telefono: telefono.trim() || null,
      })
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 className="text-[15px] font-semibold text-[#0A0A0A]">Nuevo cliente</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nombre *"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              minLength={2}
              autoFocus
            />
            <Input
              label="Apellido"
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
            />
            <Input
              label="DNI"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
            />
            <Input
              label="Teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={isPending}
              className="h-10 px-4 text-sm font-medium text-gray-700 border border-gray-200 rounded-full hover:bg-gray-50 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="h-10 px-4 text-sm font-semibold bg-[#0A0A0A] hover:bg-gray-800 text-white rounded-full disabled:opacity-60"
            >
              {isPending ? 'Creando…' : 'Crear y seleccionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
