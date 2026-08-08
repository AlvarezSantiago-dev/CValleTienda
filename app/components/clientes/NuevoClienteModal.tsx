'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
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

function NuevoClienteForm({
  initialNombre,
  onClose,
  onCreated,
}: {
  initialNombre: string
  onClose: () => void
  onCreated: (cliente: ClienteCreado) => void
}) {
  const [nombre, setNombre] = useState(initialNombre)
  const [apellido, setApellido] = useState('')
  const [dni, setDni] = useState('')
  const [telefono, setTelefono] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
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
    <Modal
      open
      onClose={onClose}
      title="Nuevo cliente"
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => handleSubmit()} disabled={isPending}>
            {isPending ? 'Creando…' : 'Crear y seleccionar'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
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
          <Input label="DNI" value={dni} onChange={(e) => setDni(e.target.value)} />
          <Input
            label="Teléfono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />
        </div>

        {error && (
          <div className="rounded-[var(--radius-lg)] border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-soft-fg">
            {error}
          </div>
        )}
      </form>
    </Modal>
  )
}

export function NuevoClienteModal({
  open,
  onClose,
  onCreated,
  initialNombre = '',
}: NuevoClienteModalProps) {
  if (!open) return null

  return (
    <NuevoClienteForm
      key={initialNombre}
      initialNombre={initialNombre}
      onClose={onClose}
      onCreated={onCreated}
    />
  )
}
