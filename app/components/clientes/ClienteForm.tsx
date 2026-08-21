'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import type { Cliente } from '@/types/database'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { useAutoFocus } from '@/lib/hooks/useAutoFocus'
import {
  crearCliente,
  actualizarCliente,
  type ClienteInput,
} from '@/app/actions/clientes'
import { useRubro } from '@/components/layout/RubroProvider'

interface ClienteFormProps {
  mode: 'create' | 'edit'
  initial?: Cliente
  /** Si se pasa, se llama tras éxito en lugar de redirigir. Útil en modales. */
  onSuccess?: (data: { id: string }) => void
  /** Si no hay onSuccess, redirige aquí; default = `/clientes/{id}` */
  redirectOnSuccess?: string
  /** Render compacto para modales */
  compact?: boolean
}

export function ClienteForm({
  mode,
  initial,
  onSuccess,
  redirectOnSuccess,
  compact = false,
}: ClienteFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const nombreRef = useRef<HTMLInputElement>(null)
  useAutoFocus(nombreRef)

  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [apellido, setApellido] = useState(initial?.apellido ?? '')
  const [dni, setDni] = useState(initial?.dni ?? '')
  const [telefono, setTelefono] = useState(initial?.telefono ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [direccion, setDireccion] = useState(initial?.direccion ?? '')
  const [ciudad, setCiudad] = useState(initial?.ciudad ?? '')
  const [fechaNacimiento, setFechaNacimiento] = useState(initial?.fecha_nacimiento ?? '')
  const [notas, setNotas] = useState(initial?.notas ?? '')
  const [cuit, setCuit] = useState(initial?.cuit ?? '')
  const [limiteCc, setLimiteCc] = useState(
    initial?.limite_cc != null ? String(initial.limite_cc) : ''
  )
  const { usarPedidoCc } = useRubro()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const input: ClienteInput = {
      nombre,
      apellido,
      dni,
      telefono,
      email,
      direccion,
      ciudad,
      fecha_nacimiento: fechaNacimiento,
      notas,
      ...(usarPedidoCc
        ? {
            cuit,
            limite_cc: limiteCc !== '' ? Math.max(0, Number(limiteCc) || 0) : null,
          }
        : {}),
    }

    startTransition(async () => {
      const res =
        mode === 'create'
          ? await crearCliente(input)
          : await actualizarCliente(initial!.id, input)

      if (!res.ok) {
        setError(res.error ?? 'Error desconocido')
        return
      }

      const id = res.data?.id ?? initial?.id ?? ''
      if (onSuccess) {
        onSuccess({ id })
      } else {
        router.push(redirectOnSuccess ?? `/clientes/${id}`)
        router.refresh()
      }
    })
  }

  const gridCls = compact
    ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
    : 'grid grid-cols-1 sm:grid-cols-2 gap-4'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className={gridCls}>
        <Input
          ref={nombreRef}
          label={usarPedidoCc ? 'Nombre / comercio *' : 'Nombre *'}
          name="nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          required
          minLength={2}
        />
        <Input
          label="Apellido"
          name="apellido"
          value={apellido ?? ''}
          onChange={(e) => setApellido(e.target.value)}
        />
        <Input
          label="DNI"
          name="dni"
          value={dni ?? ''}
          onChange={(e) => setDni(e.target.value)}
        />
        <Input
          label="Teléfono"
          name="telefono"
          value={telefono ?? ''}
          onChange={(e) => setTelefono(e.target.value)}
        />
        {usarPedidoCc && (
          <>
            <Input
              label="CUIT"
              name="cuit"
              value={cuit ?? ''}
              onChange={(e) => setCuit(e.target.value)}
            />
            <Input
              label="Límite de cuenta"
              name="limite_cc"
              type="number"
              min={0}
              step="0.01"
              value={limiteCc}
              onChange={(e) => setLimiteCc(e.target.value)}
              hint="Aviso en el POS si se supera. No bloquea."
            />
          </>
        )}
        {!compact && (
          <>
            <Input
              label="Email"
              type="email"
              name="email"
              value={email ?? ''}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Fecha de nacimiento"
              type="date"
              name="fecha_nacimiento"
              value={fechaNacimiento ?? ''}
              onChange={(e) => setFechaNacimiento(e.target.value)}
            />
            <Input
              label="Dirección"
              name="direccion"
              value={direccion ?? ''}
              onChange={(e) => setDireccion(e.target.value)}
            />
            <Input
              label="Ciudad"
              name="ciudad"
              value={ciudad ?? ''}
              onChange={(e) => setCiudad(e.target.value)}
            />
          </>
        )}
      </div>

      {!compact && (
        <Textarea
          label="Notas"
          name="notas"
          rows={3}
          value={notas ?? ''}
          onChange={(e) => setNotas(e.target.value)}
        />
      )}

      {error && (
        <div className="rounded-[var(--radius-lg)] border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-soft-fg">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button type="submit" disabled={isPending}
          className="h-10 px-4 text-sm font-semibold bg-fg hover:bg-fg-muted text-white rounded-[var(--radius-full)] disabled:opacity-60 transition-colors"
        >
          {isPending
            ? 'Guardando…'
            : mode === 'create'
              ? 'Crear cliente'
              : 'Guardar cambios'}
        </button>
        {!onSuccess && (
          <button
            type="button"
            onClick={() => router.back()}
            disabled={isPending}
            className="h-10 px-4 text-sm font-medium text-fg border border-border-default rounded-[var(--radius-full)] hover:bg-surface-sunken disabled:opacity-60"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
