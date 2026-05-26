'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { invitarMiembro, toggleActivoMiembro, type MiembroEquipo } from '@/app/actions/equipo'

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

  return (
    <div className="space-y-6">
      {/* Lista de miembros */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-semibold text-gray-900">Miembros del equipo</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">{miembros.length} miembro{miembros.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setMostrarForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A0A0A] text-white text-[12px] font-semibold
                       hover:bg-gray-800 transition-colors"
          >
            <span className="text-[16px] leading-none">+</span> Agregar cajero
          </button>
        </div>

        {miembros.length === 0 ? (
          <div className="px-5 py-10 text-center text-[13px] text-gray-400">
            Todavía no hay miembros en el equipo.
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {miembros.map((m) => (
              <li key={m.id} className="px-5 py-4 flex items-center gap-4">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-lime-50 flex items-center justify-center text-lime-700 font-bold text-[13px] flex-shrink-0">
                  {m.nombre.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-gray-900 truncate">
                    {m.nombre} {m.apellido ?? ''}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      m.rol === 'owner'   ? 'bg-purple-100 text-purple-700' :
                      m.rol === 'admin'   ? 'bg-blue-100 text-blue-700' :
                                           'bg-gray-100 text-gray-600'
                    }`}>
                      {ROL_LABEL[m.rol] ?? m.rol}
                    </span>
                    {!m.activo && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                        Inactivo
                      </span>
                    )}
                  </div>
                </div>

                {/* Acción — no se puede desactivar al owner */}
                {m.rol !== 'owner' && (
                  <button
                    onClick={() => handleToggle(m.id, m.activo)}
                    disabled={isPending}
                    className={`text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 ${
                      m.activo
                        ? 'border-red-200 text-red-600 hover:bg-red-50'
                        : 'border-lime-200 text-lime-700 hover:bg-lime-50'
                    }`}
                  >
                    {m.activo ? 'Desactivar' : 'Activar'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Form para agregar cajero */}
      {mostrarForm && (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="text-[14px] font-semibold text-gray-900 mb-4">Nuevo cajero</h3>
          <form onSubmit={handleCrear} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Nombre *</label>
                <input
                  name="nombre"
                  type="text"
                  required
                  placeholder="Juan"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px]
                             focus:outline-none focus:ring-2 focus:ring-lime-400/60 focus:border-lime-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Apellido</label>
                <input
                  name="apellido"
                  type="text"
                  placeholder="García"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px]
                             focus:outline-none focus:ring-2 focus:ring-lime-400/60 focus:border-lime-400 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Email *</label>
              <input
                name="email"
                type="email"
                required
                placeholder="cajero@tutienda.com"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px]
                           focus:outline-none focus:ring-2 focus:ring-lime-400/60 focus:border-lime-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1.5">Contraseña *</label>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px]
                           focus:outline-none focus:ring-2 focus:ring-lime-400/60 focus:border-lime-400 transition-all"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                El cajero puede cambiar su contraseña luego desde su perfil.
              </p>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-[12px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-[#0A0A0A] text-white text-[12px] font-semibold
                           hover:bg-gray-800 disabled:opacity-40 transition-all"
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
