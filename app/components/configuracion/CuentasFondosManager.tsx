'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import {
  crearCuentaFondo,
  actualizarCuentaFondo,
  eliminarCuentaFondo,
  reactivarCuentaFondo,
  type CuentaFondoInput,
} from '@/app/actions/configuracion'
import type { CuentaFondo } from '@/lib/configuracion/queries'
import type { PosicionCuenta } from '@/lib/fondos/posicion'

type CuentaFondoUI = CuentaFondo & Partial<PosicionCuenta>

interface CuentasFondosManagerProps {
  cuentas: CuentaFondoUI[]
}

type ModalState =
  | null
  | { mode: 'crear' }
  | { mode: 'editar'; id: string }

type FormState = {
  nombre: string
  tipo: CuentaFondoInput['tipo']
  descripcion: string
  color: string
  icono: string
  /** Vacío = automático al crear */
  orden: string
}

const TIPOS: Array<{ value: CuentaFondoInput['tipo']; label: string }> = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'mercado_pago', label: 'Mercado Pago' },
  { value: 'banco', label: 'Banco' },
  { value: 'otro', label: 'Otro' },
]

const formVacio: FormState = {
  nombre: '',
  tipo: 'efectivo',
  descripcion: '',
  color: '#6366f1',
  icono: 'wallet',
  orden: '',
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

function labelSaldo(c: CuentaFondoUI) {
  const alMomento = c.saldoAlMomento ?? c.saldo_actual
  const proyectado = c.saldoProyectado ?? c.saldo_actual
  if (c.porAcreditar && c.porAcreditar > 0 && proyectado !== alMomento) {
    return `Al momento ${formatARS(alMomento)} · Proyectado ${formatARS(proyectado)}`
  }
  return `Al momento ${formatARS(alMomento)}`
}

function parseOrdenOpcional(orden: string): number | undefined {
  const t = orden.trim()
  if (!t) return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

export function CuentasFondosManager({ cuentas }: CuentasFondosManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [form, setForm] = useState<FormState>(formVacio)
  const [mostrarInactivas, setMostrarInactivas] = useState(false)
  const [avanzadoAbierto, setAvanzadoAbierto] = useState(false)

  const visibles = mostrarInactivas ? cuentas : cuentas.filter((c) => c.activo)
  const editando = modal?.mode === 'editar' ? cuentas.find((c) => c.id === modal.id) : null

  function openCrear() {
    setError(null)
    setForm(formVacio)
    setAvanzadoAbierto(false)
    setModal({ mode: 'crear' })
  }

  function openEditar(c: CuentaFondo) {
    setError(null)
    setForm({
      nombre: c.nombre,
      tipo: c.tipo,
      descripcion: c.descripcion ?? '',
      color: c.color ?? '#6366f1',
      icono: c.icono ?? 'wallet',
      orden: String(c.orden),
    })
    setAvanzadoAbierto(false)
    setModal({ mode: 'editar', id: c.id })
  }

  function closeModal() {
    if (isPending) return
    setModal(null)
    setError(null)
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

  function guardar() {
    setError(null)
    if (!form.nombre.trim()) {
      setError('Ingresá un nombre')
      return
    }
    const ordenParsed = parseOrdenOpcional(form.orden)
    const payload: CuentaFondoInput = {
      nombre: form.nombre,
      tipo: form.tipo,
      descripcion: form.descripcion,
      color: form.color,
      icono: form.icono,
      orden: modal?.mode === 'editar' ? ordenParsed ?? 0 : ordenParsed,
    }
    startTransition(async () => {
      const res =
        modal?.mode === 'editar'
          ? await actualizarCuentaFondo(modal.id, payload)
          : await crearCuentaFondo(payload)
      if (res.ok) {
        setModal(null)
        router.refresh()
      } else {
        setError(res.error ?? 'Error al guardar')
      }
    })
  }

  return (
    <div id="cuentas-fondos" className="space-y-4 scroll-mt-24">
      <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-surface-sunken px-4 py-3 text-sm text-fg-secondary">
        Cada cuenta es un lugar donde guardás plata (efectivo en caja, billetera digital, banco).
        Si varias personas o canales manejan dinero por separado, creá una cuenta por cada
        combinación.
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
            checked={mostrarInactivas}
            onChange={(e) => setMostrarInactivas(e.target.checked)}
            className="h-4 w-4 rounded border-border-default text-fg-brand focus:ring-primary/40"
          />
          Mostrar inactivas
        </label>
        <Button type="button" size="md" className="min-h-11 md:min-h-0" onClick={openCrear}>
          Agregar cuenta
        </Button>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {visibles.length === 0 && (
          <p className="text-sm text-fg-muted py-6 text-center">Todavía no hay cuentas.</p>
        )}
        {visibles.map((c) => (
          <div
            key={c.id}
            className={`bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-4 ${!c.activo ? 'opacity-70' : ''}`}
          >
            <div className="flex items-start gap-3">
              <span
                className="mt-1 h-4 w-4 rounded-[var(--radius-full)] shrink-0 border border-border-default"
                style={{ background: c.color ?? '#6366f1' }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-fg truncate">{c.nombre}</p>
                <p className="text-xs text-fg-muted">
                  {TIPOS.find((t) => t.value === c.tipo)?.label ?? c.tipo}
                  {c.descripcion ? ` · ${c.descripcion}` : ''}
                </p>
                <p className="text-xs font-medium text-fg tabular-nums mt-0.5">{labelSaldo(c)}</p>
                <p className="text-xs text-fg-subtle mt-1">Orden {c.orden}</p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-[var(--radius-full)] text-xs font-semibold border shrink-0 ${
                  c.activo
                    ? 'bg-primary-soft border-primary-border text-fg-brand'
                    : 'bg-surface-sunken border-transparent text-fg-muted'
                }`}
              >
                {c.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1 min-h-11"
                disabled={isPending}
                onClick={() => openEditar(c)}
              >
                Editar
              </Button>
              <Button
                type="button"
                variant={c.activo ? 'danger' : 'outline'}
                size="sm"
                className="min-h-11"
                disabled={isPending}
                title={
                  c.activo && c.metodos_count > 0
                    ? 'Tiene métodos activos asociados'
                    : undefined
                }
                onClick={() => toggleActivo(c)}
              >
                {c.activo ? 'Desactivar' : 'Reactivar'}
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
          <tbody className="divide-y divide-border-subtle">
            {visibles.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-fg-muted">
                  Todavía no hay cuentas. Usá “Agregar cuenta”.
                </td>
              </tr>
            )}
            {visibles.map((c) => (
              <tr key={c.id} className={!c.activo ? 'bg-surface-sunken/60 opacity-70' : ''}>
                <td className="px-3 py-2 font-medium text-fg">{c.nombre}</td>
                <td className="px-3 py-2 text-fg">
                  {TIPOS.find((t) => t.value === c.tipo)?.label ?? c.tipo}
                </td>
                <td className="px-3 py-2 text-fg">{c.descripcion ?? '—'}</td>
                <td className="px-3 py-2">
                  <span
                    className="inline-block h-5 w-5 rounded border border-border-default"
                    style={{ background: c.color ?? '#6366f1' }}
                    aria-label={c.color ?? ''}
                  />
                </td>
                <td className="px-3 py-2 text-right font-medium text-fg">{labelSaldo(c)}</td>
                <td className="px-3 py-2 text-fg">{c.metodos_count}</td>
                <td className="px-3 py-2 text-fg">{c.orden}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-block rounded-[var(--radius-full)] px-2 py-0.5 text-xs font-semibold border ${
                      c.activo
                        ? 'bg-primary-soft border-primary-border text-fg-brand'
                        : 'bg-surface-sunken border-transparent text-fg-muted'
                    }`}
                  >
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isPending}
                    onClick={() => openEditar(c)}
                  >
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant={c.activo ? 'danger' : 'outline'}
                    size="sm"
                    className="ml-2"
                    disabled={isPending}
                    title={
                      c.activo && c.metodos_count > 0
                        ? 'Tiene métodos activos asociados'
                        : undefined
                    }
                    onClick={() => toggleActivo(c)}
                  >
                    {c.activo ? 'Desactivar' : 'Reactivar'}
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
        title={modal?.mode === 'editar' ? 'Editar cuenta' : 'Nueva cuenta'}
        description="Definí dónde se acumula el dinero de los cobros."
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
              {modal?.mode === 'editar' ? 'Guardar' : 'Crear cuenta'}
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
              placeholder="Ej: Efectivo caja"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Tipo</label>
            <Select
              value={form.tipo}
              onChange={(e) =>
                setForm((f) => ({ ...f, tipo: e.target.value as CuentaFondoInput['tipo'] }))
              }
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">
              Descripción (CBU, CVU, etc.)
            </label>
            <Input
              placeholder="Opcional"
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Color</label>
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              className="h-10 w-14 rounded border border-border-default cursor-pointer"
            />
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
                    ? 'Si lo dejás vacío, va al final de la lista.'
                    : 'Define el orden de aparición (menor primero).'}
                </p>
              </div>
            )}
          </div>

          {editando && (
            <p className="text-xs text-fg-muted">
              Saldo: {labelSaldo(editando)} · {editando.metodos_count} método(s)
            </p>
          )}
        </div>
      </Modal>
    </div>
  )
}
