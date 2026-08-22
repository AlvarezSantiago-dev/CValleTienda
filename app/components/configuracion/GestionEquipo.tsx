'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { invitarMiembro, toggleActivoMiembro, eliminarMiembro, type MiembroEquipo } from '@/app/actions/equipo'
import { PasswordInput } from '@/components/ui/PasswordInput'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'

interface Props {
  miembrosIniciales: MiembroEquipo[]
}

const ROL_LABEL: Record<string, string> = {
  owner: 'Dueño',
  admin: 'Admin',
  vendedor: 'Cajero',
}

export function GestionEquipo({ miembrosIniciales }: Props) {
  const [miembros, setMiembros] = useState(miembrosIniciales)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  // ── Crear cajero ──────────────────────────────────────────
  function handleCrear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)

    startTransition(async () => {
      const { error } = await invitarMiembro(fd)
      if (error) {
        toast.error(error)
      } else {
        toast.success('Cajero creado exitosamente')
        form.reset()
        setMostrarForm(false)
        // Recargar la lista refrescando la page
        window.location.reload()
      }
    })
  }

  // ── Activar / desactivar ──────────────────────────────────
  function handleToggle(id: string, activoActual: boolean) {
    startTransition(async () => {
      const { error } = await toggleActivoMiembro(id, !activoActual)
      if (error) {
        toast.error(error)
      } else {
        setMiembros((prev) =>
          prev.map((m) => (m.id === id ? { ...m, activo: !activoActual } : m))
        )
        toast.success(!activoActual ? 'Miembro activado' : 'Miembro desactivado')
      }
    })
  }

  function handleEliminar(id: string, nombre: string) {
    if (!window.confirm(`¿Borrar a ${nombre} y su login? No se puede deshacer.`)) return
    startTransition(async () => {
      const { error } = await eliminarMiembro(id)
      if (error) toast.error(error)
      else {
        setMiembros((prev) => prev.filter((m) => m.id !== id))
        toast.success('Usuario eliminado')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Lista de miembros */}
      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-fg">Miembros del equipo</h2>
            <p className="text-[12px] text-fg-subtle mt-0.5">{miembros.length} miembro{miembros.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setMostrarForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] bg-fg text-white text-[12px] font-semibold
                       hover:bg-fg-muted transition-colors"
          >
            <span className="text-[16px] leading-none">+</span> Agregar cajero
          </button>
        </div>

        {miembros.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13px] text-fg-subtle">
            Todavía no hay miembros en el equipo.
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {miembros.map((m) => (
              <li key={m.id} className="px-5 py-4 flex items-center gap-4">
                <Avatar
                  name={`${m.nombre}${m.apellido ? ` ${m.apellido}` : ''}`}
                  size="sm"
                />

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-fg truncate">
                    {m.nombre} {m.apellido ?? ''}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge
                      variant={
                        m.rol === 'owner' ? 'brand' : m.rol === 'admin' ? 'info' : 'neutral'
                      }
                    >
                      {ROL_LABEL[m.rol] ?? m.rol}
                    </Badge>
                    {!m.activo && <Badge variant="danger">Inactivo</Badge>}
                  </div>
                </div>

                {/* Acción — no se puede desactivar al owner */}
                {m.rol !== 'owner' && (
                  <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleToggle(m.id, m.activo)}
                    disabled={isPending}
                    className={`text-[11px] font-medium px-3 py-1.5 rounded-[var(--radius-md)] border transition-colors disabled:opacity-40 ${
                      m.activo
                        ? 'border-danger-border text-danger-soft-fg hover:bg-danger-soft'
                        : 'border-primary-border text-fg-brand hover:bg-primary-soft'
                    }`}
                  >
                    {m.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEliminar(m.id, `${m.nombre} ${m.apellido ?? ''}`.trim())}
                    disabled={isPending}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-[var(--radius-md)] border border-danger-border text-danger-soft-fg hover:bg-danger-soft transition-colors disabled:opacity-40"
                  >
                    Borrar
                  </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Form para agregar cajero */}
      {mostrarForm && (
        <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-5">
          <h3 className="text-[14px] font-semibold text-fg mb-4">Nuevo cajero</h3>
          <form onSubmit={handleCrear} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-fg mb-1.5">Nombre *</label>
                <input
                  name="nombre"
                  type="text"
                  required
                  placeholder="Juan"
                  className="w-full px-3 py-2.5 rounded-[var(--radius-lg)] border border-border-default text-[13px]
                             focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-fg mb-1.5">Apellido</label>
                <input
                  name="apellido"
                  type="text"
                  placeholder="García"
                  className="w-full px-3 py-2.5 rounded-[var(--radius-lg)] border border-border-default text-[13px]
                             focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-fg mb-1.5">Email *</label>
              <input
                name="email"
                type="email"
                required
                placeholder="cajero@tutienda.com"
                className="w-full px-3 py-2.5 rounded-[var(--radius-lg)] border border-border-default text-[13px]
                           focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-fg mb-1.5">Contraseña *</label>
              <PasswordInput
                name="password"
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-3 py-2.5 rounded-[var(--radius-lg)] border border-border-default text-[13px]
                           focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
              <p className="text-[11px] text-fg-subtle mt-1">
                El cajero puede cambiar su contraseña luego desde su perfil.
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="px-4 py-2 rounded-[var(--radius-lg)] border border-border-default text-[12px] font-medium text-fg-muted hover:bg-surface-sunken transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 rounded-[var(--radius-lg)] bg-fg text-white text-[12px] font-semibold
                           hover:bg-fg-muted disabled:opacity-40 transition-all"
              >
                {isPending ? 'Creando…' : 'Crear cajero'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
