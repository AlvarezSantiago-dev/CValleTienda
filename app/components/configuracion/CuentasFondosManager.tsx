'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import {
  crearCuentaFondo,
  actualizarCuentaFondo,
  eliminarCuentaFondo,
  reactivarCuentaFondo,
  type CuentaFondoInput,
} from '@/app/actions/configuracion'
import type { CuentaFondo } from '@/lib/configuracion/queries'

interface CuentasFondosManagerProps {
  cuentas: CuentaFondo[]
}

const TIPOS: Array<{ value: CuentaFondoInput['tipo']; label: string }> = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'mercado_pago', label: 'Mercado Pago' },
  { value: 'banco', label: 'Banco' },
  { value: 'otro', label: 'Otro' },
]

const filaVacia: CuentaFondoInput = {
  nombre: '',
  tipo: 'efectivo',
  descripcion: '',
  color: '#6366f1',
  icono: 'wallet',
  orden: 0,
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

export function CuentasFondosManager({ cuentas }: CuentasFondosManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [filaIdEditando, setFilaIdEditando] = useState<string | null>(null)
  const [edicion, setEdicion] = useState<Record<string, CuentaFondoInput>>({})
  const [nueva, setNueva] = useState<CuentaFondoInput>(filaVacia)
  const [mostrarInactivas, setMostrarInactivas] = useState(false)

  const visibles = mostrarInactivas ? cuentas : cuentas.filter((c) => c.activo)

  function startEdit(c: CuentaFondo) {
    setError(null)
    setFilaIdEditando(c.id)
    setEdicion((prev) => ({
      ...prev,
      [c.id]: {
        nombre: c.nombre,
        tipo: c.tipo,
        descripcion: c.descripcion ?? '',
        color: c.color ?? '#6366f1',
        icono: c.icono ?? 'wallet',
        orden: c.orden,
      },
    }))
  }

  function cancelEdit(id: string) {
    setEdicion((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setFilaIdEditando((curr) => (curr === id ? null : curr))
  }

  function updateEdit<K extends keyof CuentaFondoInput>(
    id: string,
    key: K,
    value: CuentaFondoInput[K]
  ) {
    setEdicion((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }))
  }

  function saveRow(id: string) {
    const row = edicion[id]
    if (!row) return
    setError(null)
    startTransition(async () => {
      const res = await actualizarCuentaFondo(id, {
        ...row,
        orden: Number(row.orden) || 0,
      })
      if (res.ok) {
        cancelEdit(id)
        router.refresh()
      } else {
        setError(res.error ?? 'Error al guardar')
      }
    })
  }

  function toggleActivo(c: CuentaFondo) {
    setError(null)
    startTransition(async () => {
      const res = c.activo
        ? await eliminarCuentaFondo(c.id)
        : await reactivarCuentaFondo(c.id)
      if (res.ok) router.refresh()
      else setError(res.error ?? 'Error')
    })
  }

  function crearFila() {
    setError(null)
    if (!nueva.nombre.trim()) {
      setError('Ingresá un nombre')
      return
    }
    startTransition(async () => {
      const res = await crearCuentaFondo({ ...nueva, orden: Number(nueva.orden) || 0 })
      if (res.ok) {
        setNueva(filaVacia)
        router.refresh()
      } else {
        setError(res.error ?? 'Error al crear')
      }
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Lugares donde se almacena el dinero. El saldo se actualiza automáticamente con cada
          venta. Los ajustes manuales se hacen desde el módulo de Caja.
        </p>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={mostrarInactivas}
            onChange={(e) => setMostrarInactivas(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-lime-600 focus:ring-lime-400"
          />
          Mostrar inactivas
        </label>
      </div>

      {/* Vista móvil — accordion cards — md:hidden */}
      <div className="md:hidden space-y-3">
        {visibles.map((c) => {
          const edit = edicion[c.id]
          const editing = filaIdEditando === c.id && !!edit
          return (
            <div
              key={c.id}
              className={`bg-white border border-gray-100 rounded-xl overflow-hidden ${!c.activo ? 'opacity-70' : ''}`}
            >
              {/* Cabecera */}
              <div className="flex items-center gap-3 p-4">
                <span
                  className="h-4 w-4 rounded-full shrink-0 border border-gray-200"
                  style={{ background: c.color ?? '#6366f1' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#0A0A0A] truncate">{c.nombre}</p>
                  <p className="text-xs text-gray-500">
                    {TIPOS.find((t) => t.value === c.tipo)?.label ?? c.tipo}
                    {c.descripcion ? ` · ${c.descripcion}` : ''}
                  </p>
                  <p className="text-xs font-medium text-gray-900 tabular-nums mt-0.5">
                    {formatARS(c.saldo_actual)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                      c.activo
                        ? 'bg-lime-50 border-lime-200 text-lime-700'
                        : 'bg-gray-100 border-transparent text-gray-600'
                    }`}
                  >
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <button
                    onClick={() => (editing ? cancelEdit(c.id) : startEdit(c))}
                    disabled={isPending}
                    className="h-8 px-3 text-xs font-medium border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                  >
                    {editing ? 'Cancelar' : 'Editar'}
                  </button>
                </div>
              </div>

              {/* Form desplegable */}
              {editing && edit && (
                <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
                    <Input
                      value={edit.nombre}
                      onChange={(e) => updateEdit(c.id, 'nombre', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                    <Select
                      value={edit.tipo}
                      onChange={(e) =>
                        updateEdit(c.id, 'tipo', e.target.value as CuentaFondoInput['tipo'])
                      }
                    >
                      {TIPOS.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Descripción (CBU, CVU, etc.)</label>
                    <Input
                      value={edit.descripcion ?? ''}
                      onChange={(e) => updateEdit(c.id, 'descripcion', e.target.value)}
                    />
                  </div>
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Orden</label>
                      <Input
                        type="number"
                        value={String(edit.orden)}
                        onChange={(e) => updateEdit(c.id, 'orden', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                      <input
                        type="color"
                        value={edit.color ?? '#6366f1'}
                        onChange={(e) => updateEdit(c.id, 'color', e.target.value)}
                        className="h-9 w-12 rounded border border-gray-300 cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveRow(c.id)}
                      disabled={isPending}
                      className="flex-1 h-9 bg-[#0A0A0A] text-white text-sm font-medium rounded-lg disabled:opacity-60 hover:bg-gray-800 transition-colors"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => toggleActivo(c)}
                      disabled={isPending}
                      className={`h-9 px-3 text-sm rounded-lg border transition-colors ${
                        c.activo
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                      title={c.activo && c.metodos_count > 0 ? 'Tiene métodos activos asociados' : undefined}
                    >
                      {c.activo ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Tarjeta nueva cuenta */}
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nueva cuenta</p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
            <Input
              placeholder="Ej: EFECTIVO"
              value={nueva.nombre}
              onChange={(e) => setNueva((n) => ({ ...n, nombre: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
            <Select
              value={nueva.tipo}
              onChange={(e) =>
                setNueva((n) => ({ ...n, tipo: e.target.value as CuentaFondoInput['tipo'] }))
              }
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción (CBU, CVU...)</label>
            <Input
              placeholder="Opcional"
              value={nueva.descripcion ?? ''}
              onChange={(e) => setNueva((n) => ({ ...n, descripcion: e.target.value }))}
            />
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Orden</label>
              <Input
                type="number"
                placeholder="0"
                value={String(nueva.orden)}
                onChange={(e) => setNueva((n) => ({ ...n, orden: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
              <input
                type="color"
                value={nueva.color ?? '#6366f1'}
                onChange={(e) => setNueva((n) => ({ ...n, color: e.target.value }))}
                className="h-9 w-12 rounded border border-gray-300 cursor-pointer"
              />
            </div>
          </div>
          <button
            className="w-full h-9 bg-[#0A0A0A] text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-60 transition-colors"
            onClick={crearFila}
            disabled={isPending}
          >
            + Agregar
          </button>
        </div>
      </div>

      {/* Vista desktop — tabla — hidden md:block */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-100 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Descripción</th>
              <th className="px-3 py-2">Color</th>
              <th className="px-3 py-2 text-right">Saldo</th>
              <th className="px-3 py-2">Métodos</th>
              <th className="px-3 py-2">Orden</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibles.map((c) => {
              const edit = edicion[c.id]
              const editing = filaIdEditando === c.id && !!edit
              return (
                <tr
                  key={c.id}
                  className={!c.activo ? 'bg-gray-50/60 opacity-70' : ''}
                >
                  {editing ? (
                    <>
                      <td className="px-3 py-2">
                        <Input
                          value={edit.nombre}
                          onChange={(e) => updateEdit(c.id, 'nombre', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 min-w-[140px]">
                        <Select
                          value={edit.tipo}
                          onChange={(e) =>
                            updateEdit(
                              c.id,
                              'tipo',
                              e.target.value as CuentaFondoInput['tipo']
                            )
                          }
                        >
                          {TIPOS.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={edit.descripcion ?? ''}
                          onChange={(e) =>
                            updateEdit(c.id, 'descripcion', e.target.value)
                          }
                        />
                      </td>
                      <td className="px-3 py-2 w-16">
                        <input
                          type="color"
                          value={edit.color ?? '#6366f1'}
                          onChange={(e) => updateEdit(c.id, 'color', e.target.value)}
                          className="h-9 w-12 rounded border border-gray-300 cursor-pointer"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-gray-500">
                        {formatARS(c.saldo_actual)}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{c.metodos_count}</td>
                      <td className="px-3 py-2 w-20">
                        <Input
                          type="number"
                          value={String(edit.orden)}
                          onChange={(e) =>
                            updateEdit(c.id, 'orden', Number(e.target.value))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button
                          className="h-8 px-3 text-xs font-medium bg-[#0A0A0A] text-white rounded-full disabled:opacity-60 hover:bg-gray-800 transition-colors"
                          onClick={() => saveRow(c.id)}
                          disabled={isPending}
                        >
                          Guardar
                        </button>
                        <button
                          className="ml-2 h-8 px-3 text-xs font-medium border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                          onClick={() => cancelEdit(c.id)}
                          disabled={isPending}
                        >
                          Cancelar
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 font-medium text-gray-900">{c.nombre}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {TIPOS.find((t) => t.value === c.tipo)?.label ?? c.tipo}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{c.descripcion ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span
                          className="inline-block h-5 w-5 rounded border border-gray-200"
                          style={{ background: c.color ?? '#6366f1' }}
                          aria-label={c.color ?? ''}
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">
                        {formatARS(c.saldo_actual)}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{c.metodos_count}</td>
                      <td className="px-3 py-2 text-gray-700">{c.orden}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold border ${
                            c.activo
                              ? 'bg-lime-50 border-lime-200 text-lime-700'
                              : 'bg-gray-100 border-transparent text-gray-600'
                          }`}
                        >
                          {c.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button
                          className="h-8 px-3 text-xs font-medium border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                          onClick={() => startEdit(c)}
                          disabled={isPending}
                        >
                          Editar
                        </button>
                        <button
                          className={`ml-2 h-8 px-3 text-xs font-medium rounded-full transition-colors ${
                            c.activo
                              ? 'border border-red-200 text-red-600 hover:bg-red-50'
                              : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                          onClick={() => toggleActivo(c)}
                          disabled={isPending}
                          title={
                            c.activo && c.metodos_count > 0
                              ? 'Tiene métodos activos asociados'
                              : undefined
                          }
                        >
                          {c.activo ? 'Desactivar' : 'Reactivar'}
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              )
            })}

            {/* Fila nueva */}
            <tr className="bg-lime-50/30">
              <td className="px-3 py-2">
                <Input
                  placeholder="Ej: Cuenta USD"
                  value={nueva.nombre}
                  onChange={(e) => setNueva((n) => ({ ...n, nombre: e.target.value }))}
                />
              </td>
              <td className="px-3 py-2 min-w-[140px]">
                <Select
                  value={nueva.tipo}
                  onChange={(e) =>
                    setNueva((n) => ({
                      ...n,
                      tipo: e.target.value as CuentaFondoInput['tipo'],
                    }))
                  }
                >
                  {TIPOS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </td>
              <td className="px-3 py-2">
                <Input
                  placeholder="Opcional"
                  value={nueva.descripcion ?? ''}
                  onChange={(e) =>
                    setNueva((n) => ({ ...n, descripcion: e.target.value }))
                  }
                />
              </td>
              <td className="px-3 py-2 w-16">
                <input
                  type="color"
                  value={nueva.color ?? '#6366f1'}
                  onChange={(e) => setNueva((n) => ({ ...n, color: e.target.value }))}
                  className="h-9 w-12 rounded border border-gray-300 cursor-pointer"
                />
              </td>
              <td className="px-3 py-2 text-right text-gray-400">—</td>
              <td className="px-3 py-2 text-gray-400">—</td>
              <td className="px-3 py-2 w-20">
                <Input
                  type="number"
                  placeholder="0"
                  value={String(nueva.orden)}
                  onChange={(e) =>
                    setNueva((n) => ({ ...n, orden: Number(e.target.value) }))
                  }
                />
              </td>
              <td className="px-3 py-2 text-xs text-gray-500">Nuevo</td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                <button
                  className="h-8 px-3 text-xs font-medium bg-[#0A0A0A] text-white rounded-full hover:bg-gray-800 disabled:opacity-60 transition-colors"
                  onClick={crearFila}
                  disabled={isPending}
                >
                  + Agregar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
