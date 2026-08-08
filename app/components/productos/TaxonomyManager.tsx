'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { titleCase, upperCaseTrim } from '@/lib/utils/text'

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
  /**
   * Modo de normalización del nombre. Se evalúa dentro del componente para
   * permitir serialización desde Server Components.
   * - 'titleCase': Primera letra mayúscula por palabra (categorías, colores)
   * - 'upperCase': Todo mayúsculas (tallas de ropa)
   */
  normalizeMode?: 'titleCase' | 'upperCase'
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
  normalizeMode,
  onCrear,
  onActualizar,
  onEliminar,
}: TaxonomyManagerProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const normalize =
    normalizeMode === 'upperCase'
      ? upperCaseTrim
      : normalizeMode === 'titleCase'
        ? titleCase
        : undefined

  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoExtra, setNuevoExtra] = useState('')

  const [editId, setEditId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editExtra, setEditExtra] = useState('')
  const [eliminarId, setEliminarId] = useState<string | null>(null)

  function refresh() {
    router.refresh()
  }

  function handleCrear(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!nuevoNombre.trim()) return
    startTransition(async () => {
      const res = await onCrear(
        normalize ? normalize(nuevoNombre) : nuevoNombre.trim(),
        nuevoExtra.trim()
      )
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
      const res = await onActualizar(
        editId,
        normalize ? normalize(editNombre) : editNombre.trim(),
        editExtra.trim()
      )
      if (!res.ok) {
        setError(res.error ?? 'Error')
        return
      }
      setEditId(null)
      refresh()
    })
  }

  function confirmarEliminar() {
    if (!eliminarId) return
    const id = eliminarId
    setEliminarId(null)
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
        className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-5 flex flex-col md:flex-row gap-3 md:items-end shadow-xs"
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
          {pending ? 'Creando…' : 'Crear'}
        </Button>
      </form>

      {error && (
        <div className="bg-danger-soft border border-danger-border text-danger-soft-fg rounded-[var(--radius-md)] px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden shadow-xs">
        {items.length === 0 ? (
          <EmptyState
            title={`Sin ${titulo.toLowerCase()}s`}
            description="Creá el primero con el formulario de arriba."
            className="border-0 shadow-none"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-sunken">
                <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-fg-subtle">
                  <th className="text-left px-4 py-3">Nombre</th>
                  {extraLabel && <th className="text-left px-4 py-3">{extraLabel}</th>}
                  <th className="px-4 py-3 w-40" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) =>
                  editId === item.id ? (
                    <tr
                      key={item.id}
                      className="border-t border-border-subtle bg-primary-soft/40"
                    >
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
                      className="border-t border-border-subtle hover:bg-surface-hover transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-fg">{item.nombre}</td>
                      {extraLabel && (
                        <td className="px-4 py-3 text-fg-muted">
                          {extraType === 'color' && item.extra ? (
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="inline-block w-4 h-4 rounded border border-border-default"
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
                            className="text-xs text-fg-brand hover:underline cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEliminarId(item.id)}
                            className="text-xs text-danger-soft-fg hover:underline cursor-pointer"
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
          </div>
        )}
      </div>

      <Modal
        open={Boolean(eliminarId)}
        onClose={() => setEliminarId(null)}
        title={`Eliminar ${titulo.toLowerCase()}`}
        description="Se desactivará pero no se borra del historial."
        size="sm"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setEliminarId(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={confirmarEliminar} disabled={pending}>
              {pending ? 'Eliminando…' : 'Eliminar'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg-muted">
          ¿Confirmás eliminar este elemento? Podés seguir usándolo en registros históricos.
        </p>
      </Modal>
    </div>
  )
}
