'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export interface TaxonomyItem {
  id: string
  nombre: string
  /** Campo extra a mostrar/editar: descripción, hex, orden... */
  extra?: string | number | null
  activo: boolean
}

interface TaxonomyManagerProps {
  titulo: string
  items: TaxonomyItem[]
  /** Etiqueta del campo extra (ej: 'Hex', 'Orden', 'Descripción') */
  extraLabel?: string
  extraPlaceholder?: string
  /** Tipo del input extra */
  extraType?: 'text' | 'number' | 'color'
  /** Placeholder del campo nombre en el formulario de creación */
  createPlaceholder?: string
  onCrear: (
    nombre: string,
    extra: string
  ) => Promise<{ ok: boolean; error?: string }>
  onActualizar: (
    id: string,
    nombre: string,
    extra: string
  ) => Promise<{ ok: boolean; error?: string }>
  onEliminar: (id: string) => Promise<{ ok: boolean; error?: string }>
}

export function TaxonomyManager({
  titulo,
  items,
  extraLabel,
  extraPlaceholder,
  extraType = 'text',
  createPlaceholder,
  onCrear,
  onActualizar,
  onEliminar,
}: TaxonomyManagerProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoExtra, setNuevoExtra] = useState('')

  const [editId, setEditId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editExtra, setEditExtra] = useState('')

  function refresh() {
    router.refresh()
  }

  function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nuevoNombre.trim()) return
    startTransition(async () => {
      const res = await onCrear(nuevoNombre.trim(), nuevoExtra.trim())
      if (!res.ok) {
        setError(res.error ?? 'Error')
        return
      }
      setNuevoNombre('')
      setNuevoExtra('')
      refresh()
    })
  }

  function startEdit(item: TaxonomyItem) {
    setEditId(item.id)
    setEditNombre(item.nombre)
    setEditExtra(item.extra != null ? String(item.extra) : '')
    setError(null)
  }

  function handleGuardarEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editId || !editNombre.trim()) return
    startTransition(async () => {
      const res = await onActualizar(editId, editNombre.trim(), editExtra.trim())
      if (!res.ok) {
        setError(res.error ?? 'Error')
        return
      }
      setEditId(null)
      refresh()
    })
  }

  function handleEliminar(id: string) {
    if (!confirm('¿Eliminar este elemento? Se desactivará pero no se borra del historial.'))
      return
    startTransition(async () => {
      const res = await onEliminar(id)
      if (!res.ok) {
        setError(res.error ?? 'Error')
        return
      }
      refresh()
    })
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCrear}
        className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col md:flex-row gap-3 md:items-end"
      >
        <div className="flex-1">
          <Input
            label="Nombre"
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder={createPlaceholder ?? `Nuevo ${titulo.toLowerCase()}`}
            required
          />
        </div>
        {extraLabel && (
          <div className="flex-1">
            <Input
              label={extraLabel}
              type={extraType}
              value={nuevoExtra}
              onChange={(e) => setNuevoExtra(e.target.value)}
              placeholder={extraPlaceholder}
            />
          </div>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? 'Creando...' : 'Crear'}
        </Button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-10">
            Todavía no hay elementos. Creá el primero arriba.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">
                <th className="text-left px-4 py-3">Nombre</th>
                {extraLabel && (
                  <th className="text-left px-4 py-3">{extraLabel}</th>
                )}
                <th className="px-4 py-3 w-40"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) =>
                editId === item.id ? (
                  <tr key={item.id} className="border-t border-gray-100 bg-lime-50/40">
                    <td className="px-4 py-2">
                      <Input
                        value={editNombre}
                        onChange={(e) => setEditNombre(e.target.value)}
                      />
                    </td>
                    {extraLabel && (
                      <td className="px-4 py-2">
                        <Input
                          type={extraType}
                          value={editExtra}
                          onChange={(e) => setEditExtra(e.target.value)}
                          placeholder={extraPlaceholder}
                        />
                      </td>
                    )}
                    <td className="px-4 py-2 text-right">
                      <div className="inline-flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setEditId(null)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleGuardarEdit}
                          disabled={pending}
                        >
                          Guardar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={item.id}
                    className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{item.nombre}</td>
                    {extraLabel && (
                      <td className="px-4 py-3 text-gray-700">
                        {extraType === 'color' && item.extra ? (
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="inline-block w-4 h-4 rounded border border-gray-300"
                              style={{ backgroundColor: String(item.extra) }}
                            />
                            <span className="font-mono text-xs">{item.extra}</span>
                          </span>
                        ) : (
                          item.extra ?? '—'
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="text-xs text-lime-700 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEliminar(item.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
