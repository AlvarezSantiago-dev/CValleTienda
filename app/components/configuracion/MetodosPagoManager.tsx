'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import {
  crearMetodoPago,
  actualizarMetodoPago,
  eliminarMetodoPago,
  reactivarMetodoPago,
  type MetodoPagoInput,
} from '@/app/actions/configuracion'
import type { MetodoPago, CuentaFondo } from '@/lib/configuracion/queries'

interface MetodosPagoManagerProps {
  metodos: MetodoPago[]
  cuentasActivas: CuentaFondo[]
}

interface FilaEditable extends MetodoPagoInput {
  dirty: boolean
}

const filaVacia: MetodoPagoInput = {
  nombre: '',
  cuenta_fondo_id: '',
  descripcion: '',
  comision_porcentaje: 0,
  dias_acreditacion: 0,
  orden: 0,
}

export function MetodosPagoManager({ metodos, cuentasActivas }: MetodosPagoManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [filaIdEditando, setFilaIdEditando] = useState<string | null>(null)

  // Estado local de cada fila existente cuando entra en edición.
  const [edicion, setEdicion] = useState<Record<string, FilaEditable>>({})
  // Estado local de la fila nueva.
  const [nueva, setNueva] = useState<MetodoPagoInput>(filaVacia)
  const [mostrarInactivos, setMostrarInactivos] = useState(false)

  const visibles = mostrarInactivos ? metodos : metodos.filter((m) => m.activo)

  function startEdit(m: MetodoPago) {
    setError(null)
    setFilaIdEditando(m.id)
    setEdicion((prev) => ({
      ...prev,
      [m.id]: {
        nombre: m.nombre,
        cuenta_fondo_id: m.cuenta_fondo_id,
        descripcion: m.descripcion ?? '',
        comision_porcentaje: m.comision_porcentaje,
        dias_acreditacion: m.dias_acreditacion,
        orden: m.orden,
        dirty: false,
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

  function updateEdit<K extends keyof MetodoPagoInput>(
    id: string,
    key: K,
    value: MetodoPagoInput[K]
  ) {
    setEdicion((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: value, dirty: true },
    }))
  }

  function saveRow(id: string) {
    const row = edicion[id]
    if (!row) return
    setError(null)
    const payload: MetodoPagoInput = {
      nombre: row.nombre,
      cuenta_fondo_id: row.cuenta_fondo_id,
      descripcion: row.descripcion,
      comision_porcentaje: Number(row.comision_porcentaje) || 0,
      dias_acreditacion: Number(row.dias_acreditacion) || 0,
      orden: Number(row.orden) || 0,
    }
    startTransition(async () => {
      const res = await actualizarMetodoPago(id, payload)
      if (res.ok) {
        cancelEdit(id)
        router.refresh()
      } else {
        setError(res.error ?? 'Error al guardar')
      }
    })
  }

  function toggleActivo(id: string, activo: boolean) {
    setError(null)
    startTransition(async () => {
      const res = activo ? await eliminarMetodoPago(id) : await reactivarMetodoPago(id)
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
    if (!nueva.cuenta_fondo_id) {
      setError('Seleccioná una cuenta de fondos')
      return
    }
    startTransition(async () => {
      const res = await crearMetodoPago({
        ...nueva,
        comision_porcentaje: Number(nueva.comision_porcentaje) || 0,
        dias_acreditacion: Number(nueva.dias_acreditacion) || 0,
        orden: Number(nueva.orden) || 0,
      })
      if (res.ok) {
        setNueva(filaVacia)
        router.refresh()
      } else {
        setError(res.error ?? 'Error al crear')
      }
    })
  }

  if (cuentasActivas.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        No tenés cuentas de fondos activas. Creá al menos una en{' '}
        <a className="underline font-medium" href="/configuracion/cuentas-fondos">
          Cuentas de fondos
        </a>{' '}
        antes de configurar métodos de pago.
      </div>
    )
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
          Configurá los métodos que vas a usar en el POS. La comisión y los días de
          acreditación se snapshot-ean en cada venta.
        </p>
        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={mostrarInactivos}
            onChange={(e) => setMostrarInactivos(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-lime-600 focus:ring-lime-400"
          />
          Mostrar inactivos
        </label>
      </div>

      {/* Vista móvil — accordion cards — md:hidden */}
      <div className="md:hidden space-y-3">
        {visibles.map((m) => {
          const edit = edicion[m.id]
          const editing = filaIdEditando === m.id && !!edit
          return (
            <div
              key={m.id}
              className={`bg-white border border-gray-100 rounded-xl overflow-hidden ${!m.activo ? 'opacity-70' : ''}`}
            >
              {/* Cabecera */}
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-[#0A0A0A] truncate">{m.nombre}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {m.cuenta_fondo?.nombre ?? '—'} · {Number(m.comision_porcentaje).toFixed(2)}%
                    {m.dias_acreditacion > 0 && ` · ${m.dias_acreditacion}d`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                      m.activo
                        ? 'bg-lime-50 border-lime-200 text-lime-700'
                        : 'bg-gray-100 border-transparent text-gray-600'
                    }`}
                  >
                    {m.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <button
                    onClick={() => (editing ? cancelEdit(m.id) : startEdit(m))}
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
                      onChange={(e) => updateEdit(m.id, 'nombre', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta de fondos</label>
                    <Select
                      value={edit.cuenta_fondo_id}
                      onChange={(e) => updateEdit(m.id, 'cuenta_fondo_id', e.target.value)}
                    >
                      {cuentasActivas.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Comisión %</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="99.99"
                        value={String(edit.comision_porcentaje)}
                        onChange={(e) => updateEdit(m.id, 'comision_porcentaje', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Días acred.</label>
                      <Input
                        type="number"
                        min="0"
                        value={String(edit.dias_acreditacion)}
                        onChange={(e) => updateEdit(m.id, 'dias_acreditacion', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Orden</label>
                      <Input
                        type="number"
                        value={String(edit.orden)}
                        onChange={(e) => updateEdit(m.id, 'orden', Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveRow(m.id)}
                      disabled={isPending}
                      className="flex-1 h-9 bg-[#0A0A0A] text-white text-sm font-medium rounded-lg disabled:opacity-60 hover:bg-gray-800 transition-colors"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => toggleActivo(m.id, m.activo)}
                      disabled={isPending}
                      className={`h-9 px-3 text-sm rounded-lg border transition-colors ${
                        m.activo
                          ? 'border-red-200 text-red-600 hover:bg-red-50'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {m.activo ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* Tarjeta nuevo método */}
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nuevo método</p>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre</label>
            <Input
              placeholder="Ej: Naranja X"
              value={nueva.nombre}
              onChange={(e) => setNueva((n) => ({ ...n, nombre: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cuenta de fondos</label>
            <Select
              value={nueva.cuenta_fondo_id}
              onChange={(e) => setNueva((n) => ({ ...n, cuenta_fondo_id: e.target.value }))}
            >
              <option value="">— Seleccionar —</option>
              {cuentasActivas.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Comisión %</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="99.99"
                placeholder="0"
                value={String(nueva.comision_porcentaje)}
                onChange={(e) => setNueva((n) => ({ ...n, comision_porcentaje: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Días acred.</label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={String(nueva.dias_acreditacion)}
                onChange={(e) => setNueva((n) => ({ ...n, dias_acreditacion: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Orden</label>
              <Input
                type="number"
                placeholder="0"
                value={String(nueva.orden)}
                onChange={(e) => setNueva((n) => ({ ...n, orden: Number(e.target.value) }))}
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
              <th className="px-3 py-2">Cuenta de fondos</th>
              <th className="px-3 py-2">Comisión %</th>
              <th className="px-3 py-2">Días acred.</th>
              <th className="px-3 py-2">Orden</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibles.map((m) => {
              const edit = edicion[m.id]
              const editing = filaIdEditando === m.id && !!edit
              return (
                <tr
                  key={m.id}
                  className={!m.activo ? 'bg-gray-50/60 opacity-70' : ''}
                >
                  {editing ? (
                    <>
                      <td className="px-3 py-2">
                        <Input
                          value={edit.nombre}
                          onChange={(e) => updateEdit(m.id, 'nombre', e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 min-w-[180px]">
                        <Select
                          value={edit.cuenta_fondo_id}
                          onChange={(e) =>
                            updateEdit(m.id, 'cuenta_fondo_id', e.target.value)
                          }
                        >
                          {cuentasActivas.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-3 py-2 w-24">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="99.99"
                          value={String(edit.comision_porcentaje)}
                          onChange={(e) =>
                            updateEdit(
                              m.id,
                              'comision_porcentaje',
                              Number(e.target.value)
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2 w-20">
                        <Input
                          type="number"
                          min="0"
                          value={String(edit.dias_acreditacion)}
                          onChange={(e) =>
                            updateEdit(m.id, 'dias_acreditacion', Number(e.target.value))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 w-20">
                        <Input
                          type="number"
                          value={String(edit.orden)}
                          onChange={(e) => updateEdit(m.id, 'orden', Number(e.target.value))}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-gray-500">
                          {m.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button
                          className="h-8 px-3 text-xs font-medium bg-[#0A0A0A] text-white rounded-full disabled:opacity-60 hover:bg-gray-800 transition-colors"
                          onClick={() => saveRow(m.id)}
                          disabled={isPending}
                        >
                          Guardar
                        </button>
                        <button
                          className="ml-2 h-8 px-3 text-xs font-medium border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                          onClick={() => cancelEdit(m.id)}
                          disabled={isPending}
                        >
                          Cancelar
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {m.nombre}
                        {m.descripcion && (
                          <p className="text-xs text-gray-500 font-normal">
                            {m.descripcion}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {m.cuenta_fondo?.nombre ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {Number(m.comision_porcentaje).toFixed(2)}%
                      </td>
                      <td className="px-3 py-2 text-gray-700">{m.dias_acreditacion}</td>
                      <td className="px-3 py-2 text-gray-700">{m.orden}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold border ${
                            m.activo
                              ? 'bg-lime-50 border-lime-200 text-lime-700'
                              : 'bg-gray-100 border-transparent text-gray-600'
                          }`}
                        >
                          {m.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button
                          className="h-8 px-3 text-xs font-medium border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                          onClick={() => startEdit(m)}
                          disabled={isPending}
                        >
                          Editar
                        </button>
                        <button
                          className={`ml-2 h-8 px-3 text-xs font-medium rounded-full transition-colors ${
                            m.activo
                              ? 'border border-red-200 text-red-600 hover:bg-red-50'
                              : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                          onClick={() => toggleActivo(m.id, m.activo)}
                          disabled={isPending}
                        >
                          {m.activo ? 'Desactivar' : 'Reactivar'}
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
                  placeholder="Ej: Naranja X"
                  value={nueva.nombre}
                  onChange={(e) => setNueva((n) => ({ ...n, nombre: e.target.value }))}
                />
              </td>
              <td className="px-3 py-2 min-w-[180px]">
                <Select
                  value={nueva.cuenta_fondo_id}
                  onChange={(e) =>
                    setNueva((n) => ({ ...n, cuenta_fondo_id: e.target.value }))
                  }
                >
                  <option value="">— Seleccionar —</option>
                  {cuentasActivas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </Select>
              </td>
              <td className="px-3 py-2 w-24">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="99.99"
                  placeholder="0"
                  value={String(nueva.comision_porcentaje)}
                  onChange={(e) =>
                    setNueva((n) => ({
                      ...n,
                      comision_porcentaje: Number(e.target.value),
                    }))
                  }
                />
              </td>
              <td className="px-3 py-2 w-20">
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={String(nueva.dias_acreditacion)}
                  onChange={(e) =>
                    setNueva((n) => ({ ...n, dias_acreditacion: Number(e.target.value) }))
                  }
                />
              </td>
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
