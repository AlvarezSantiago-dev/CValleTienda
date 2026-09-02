'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
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

type ModalState =
  | null
  | { mode: 'crear' }
  | { mode: 'editar'; id: string }

type FormState = {
  nombre: string
  cuenta_fondo_id: string
  descripcion: string
  comision_porcentaje: string
  dias_acreditacion: string
  /** Vacío = automático al crear */
  orden: string
}

const formVacio: FormState = {
  nombre: '',
  cuenta_fondo_id: '',
  descripcion: '',
  comision_porcentaje: '0',
  dias_acreditacion: '0',
  orden: '',
}

function parseOrdenOpcional(orden: string): number | undefined {
  const t = orden.trim()
  if (!t) return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

export function MetodosPagoManager({ metodos, cuentasActivas }: MetodosPagoManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [form, setForm] = useState<FormState>(formVacio)
  const [mostrarInactivos, setMostrarInactivos] = useState(false)
  const [avanzadoAbierto, setAvanzadoAbierto] = useState(false)

  const visibles = mostrarInactivos ? metodos : metodos.filter((m) => m.activo)

  function openCrear() {
    setError(null)
    setForm({
      ...formVacio,
      cuenta_fondo_id: cuentasActivas[0]?.id ?? '',
    })
    setAvanzadoAbierto(false)
    setModal({ mode: 'crear' })
  }

  function openEditar(m: MetodoPago) {
    setError(null)
    setForm({
      nombre: m.nombre,
      cuenta_fondo_id: m.cuenta_fondo_id,
      descripcion: m.descripcion ?? '',
      comision_porcentaje: String(m.comision_porcentaje),
      dias_acreditacion: String(m.dias_acreditacion),
      orden: String(m.orden),
    })
    setAvanzadoAbierto(false)
    setModal({ mode: 'editar', id: m.id })
  }

  function closeModal() {
    if (isPending) return
    setModal(null)
    setError(null)
  }

  function toggleActivo(id: string, activo: boolean) {
    setError(null)
    startTransition(async () => {
      const res = activo ? await eliminarMetodoPago(id) : await reactivarMetodoPago(id)
      if (res.ok) router.refresh()
      else setError(res.error ?? 'Error')
    })
  }

  function guardar() {
    setError(null)
    if (!form.nombre.trim()) {
      setError('Ingresá un nombre')
      return
    }
    if (!form.cuenta_fondo_id) {
      setError('Seleccioná una cuenta de fondos')
      return
    }
    const ordenParsed = parseOrdenOpcional(form.orden)
    const payload: MetodoPagoInput = {
      nombre: form.nombre,
      cuenta_fondo_id: form.cuenta_fondo_id,
      descripcion: form.descripcion,
      comision_porcentaje: Number(form.comision_porcentaje) || 0,
      dias_acreditacion: Number(form.dias_acreditacion) || 0,
      orden: modal?.mode === 'editar' ? ordenParsed ?? 0 : ordenParsed,
    }
    startTransition(async () => {
      const res =
        modal?.mode === 'editar'
          ? await actualizarMetodoPago(modal.id, payload)
          : await crearMetodoPago(payload)
      if (res.ok) {
        setModal(null)
        router.refresh()
      } else {
        setError(res.error ?? 'Error al guardar')
      }
    })
  }

  if (cuentasActivas.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-warning-border bg-warning-soft p-4 text-sm text-warning-soft-fg">
        No tenés cuentas de fondos activas. Creá al menos una en{' '}
        <a className="underline font-medium" href="#cuentas-fondos">
          Cuentas de fondos
        </a>{' '}
        antes de configurar métodos de pago.
      </div>
    )
  }

  return (
    <div id="metodos-pago" className="space-y-4 scroll-mt-24">
      <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface-sunken px-4 py-3 text-sm text-fg-secondary">
        Cada método es el botón que ves en el POS. Tiene que apuntar a una cuenta: así sabés a qué
        saldo suma el cobro. Comisión y días de acreditación se usan al vender (Mercado Pago u
        otros con demora).
      </div>

      {error && !modal && (
        <div className="rounded-[var(--radius-lg)] border border-danger-border bg-danger-soft p-3 text-sm text-danger-soft-fg">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-fg">
          <input
            type="checkbox"
            checked={mostrarInactivos}
            onChange={(e) => setMostrarInactivos(e.target.checked)}
            className="h-4 w-4 rounded border-border-default text-fg-brand focus:ring-primary/40"
          />
          Mostrar inactivos
        </label>
        <Button type="button" size="md" className="min-h-11 md:min-h-0" onClick={openCrear}>
          Agregar método
        </Button>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {visibles.length === 0 && (
          <p className="text-sm text-fg-muted py-6 text-center">Todavía no hay métodos.</p>
        )}
        {visibles.map((m) => (
          <div
            key={m.id}
            className={`bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-4 ${!m.activo ? 'opacity-70' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-fg truncate">{m.nombre}</p>
                <p className="text-xs text-fg-muted mt-0.5">
                  {m.cuenta_fondo?.nombre ?? '—'} · {Number(m.comision_porcentaje).toFixed(2)}%
                  {m.dias_acreditacion > 0 && ` · ${m.dias_acreditacion}d`}
                </p>
                <p className="text-xs text-fg-subtle mt-1">Orden {m.orden}</p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-[var(--radius-full)] text-xs font-semibold border shrink-0 ${
                  m.activo
                    ? 'bg-primary-soft border-primary-border text-fg-brand'
                    : 'bg-surface-sunken border-transparent text-fg-muted'
                }`}
              >
                {m.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1 min-h-11"
                disabled={isPending}
                onClick={() => openEditar(m)}
              >
                Editar
              </Button>
              <Button
                type="button"
                variant={m.activo ? 'danger' : 'outline'}
                size="sm"
                className="min-h-11"
                disabled={isPending}
                onClick={() => toggleActivo(m.id, m.activo)}
              >
                {m.activo ? 'Desactivar' : 'Reactivar'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table — read-only */}
      <div className="hidden md:block overflow-x-auto rounded-[var(--radius-lg)] border border-border-subtle bg-surface">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-sunken text-left">
            <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-fg-subtle">
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Cuenta de fondos</th>
              <th className="px-3 py-2">Comisión %</th>
              <th className="px-3 py-2">Días acred.</th>
              <th className="px-3 py-2">Orden</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {visibles.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-fg-muted">
                  Todavía no hay métodos. Usá “Agregar método”.
                </td>
              </tr>
            )}
            {visibles.map((m) => (
              <tr key={m.id} className={!m.activo ? 'bg-surface-sunken/60 opacity-70' : ''}>
                <td className="px-3 py-2 font-medium text-fg">
                  {m.nombre}
                  {m.descripcion && (
                    <p className="text-xs text-fg-muted font-normal">{m.descripcion}</p>
                  )}
                </td>
                <td className="px-3 py-2 text-fg">{m.cuenta_fondo?.nombre ?? '—'}</td>
                <td className="px-3 py-2 text-fg">{Number(m.comision_porcentaje).toFixed(2)}%</td>
                <td className="px-3 py-2 text-fg">{m.dias_acreditacion}</td>
                <td className="px-3 py-2 text-fg">{m.orden}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block rounded-[var(--radius-full)] px-2 py-0.5 text-xs font-semibold border ${
                      m.activo
                        ? 'bg-primary-soft border-primary-border text-fg-brand'
                        : 'bg-surface-sunken border-transparent text-fg-muted'
                    }`}
                  >
                    {m.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isPending}
                    onClick={() => openEditar(m)}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant={m.activo ? 'danger' : 'outline'}
                    size="sm"
                    className="ml-2"
                    disabled={isPending}
                    onClick={() => toggleActivo(m.id, m.activo)}
                  >
                    {m.activo ? 'Desactivar' : 'Reactivar'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={modal !== null}
        onClose={closeModal}
        title={modal?.mode === 'editar' ? 'Editar método' : 'Nuevo método'}
        description="Este botón aparece en el POS y acredita en la cuenta elegida."
        size="md"
        footer={
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 w-full">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 sm:min-h-0"
              disabled={isPending}
              onClick={closeModal}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="min-h-11 sm:min-h-0"
              isLoading={isPending}
              onClick={guardar}
            >
              {modal?.mode === 'editar' ? 'Guardar' : 'Crear método'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {error && modal && (
            <div className="rounded-[var(--radius-lg)] border border-danger-border bg-danger-soft p-3 text-sm text-danger-soft-fg">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Nombre</label>
            <Input
              autoFocus
              placeholder="Ej: Transferencia"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Cuenta de fondos</label>
            <Select
              value={form.cuenta_fondo_id}
              onChange={(e) => setForm((f) => ({ ...f, cuenta_fondo_id: e.target.value }))}
            >
              <option value="">— Seleccionar —</option>
              {cuentasActivas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">Comisión %</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="99.99"
                value={form.comision_porcentaje}
                onChange={(e) => setForm((f) => ({ ...f, comision_porcentaje: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-fg-muted mb-1">
                Días de acreditación
              </label>
              <Input
                type="number"
                min="0"
                value={form.dias_acreditacion}
                onChange={(e) => setForm((f) => ({ ...f, dias_acreditacion: e.target.value }))}
              />
            </div>
          </div>

          <div className="border-t border-border-subtle pt-3">
            <button
              type="button"
              className="text-sm font-medium text-fg-brand hover:underline"
              onClick={() => setAvanzadoAbierto((v) => !v)}
            >
              {avanzadoAbierto ? 'Ocultar opciones avanzadas' : 'Opciones avanzadas'}
            </button>
            {avanzadoAbierto && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-fg-muted mb-1">Orden</label>
                <Input
                  type="number"
                  min={0}
                  placeholder={modal?.mode === 'crear' ? 'Automático' : undefined}
                  value={form.orden}
                  onChange={(e) => setForm((f) => ({ ...f, orden: e.target.value }))}
                />
                <p className="mt-1 text-xs text-fg-subtle">
                  {modal?.mode === 'crear'
                    ? 'Si lo dejás vacío, va al final de la lista del POS.'
                    : 'Define el orden de aparición en el POS (menor primero).'}
                </p>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
