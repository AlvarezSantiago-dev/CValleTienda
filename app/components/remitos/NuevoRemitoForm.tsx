'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { crearRemito, type CrearRemitoInput, type RemitoItemInput } from '@/app/actions/remitos'
import type { TipoRemito } from '@/types/database'
import { formatDate } from '@/lib/format'

interface VentaOpcion {
  id: string
  numero_ticket: number
  total: number
  cliente_nombre: string | null
  created_at: string
}

interface ClienteOpcion {
  id: string
  nombre: string
  apellido: string | null
}

interface Props {
  ventas: VentaOpcion[]
  clientes: ClienteOpcion[]
  ventaIdPreseleccionada?: string
}

const INPUT_CLS = 'w-full border border-border-default rounded-[var(--radius-lg)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40'

export function NuevoRemitoForm({ ventas, clientes, ventaIdPreseleccionada }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [tipo, setTipo]               = useState<TipoRemito>('entrega')
  const [ventaId, setVentaId]         = useState(ventaIdPreseleccionada ?? '')
  const [clienteId, setClienteId]     = useState('')
  const [destinatario, setDestinatario] = useState('')
  const [direccion, setDireccion]     = useState('')
  const [telefono, setTelefono]       = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [fechaEntrega, setFechaEntrega]   = useState('')
  const [montoTotal, setMontoTotal]   = useState(0)
  const [items, setItems]             = useState<RemitoItemInput[]>([
    { nombre_producto: '', talla: null, color: null, cantidad: 1, precio_unitario: 0 },
  ])

  function handleClienteChange(id: string) {
    setClienteId(id)
    const c = clientes.find((cl) => cl.id === id)
    if (c) {
      const nombre = [c.nombre, c.apellido].filter(Boolean).join(' ')
      setDestinatario(nombre)
    }
  }

  function addItem() {
    setItems((prev) => [...prev, { nombre_producto: '', talla: null, color: null, cantidad: 1, precio_unitario: 0 }])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof RemitoItemInput, value: string | number | null) {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  const totalCalculado = items.reduce((a, it) => a + it.cantidad * it.precio_unitario, 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!destinatario.trim()) {
      setError('El destinatario es obligatorio.')
      return
    }
    const input: CrearRemitoInput = {
      venta_id:          ventaId || null,
      cliente_id:        clienteId || null,
      tipo,
      destinatario,
      direccion_entrega: direccion,
      telefono_entrega:  telefono,
      observaciones,
      fecha_entrega:     fechaEntrega,
      monto_total:       ventaId ? 0 : (tipo === 'cuenta_corriente' ? totalCalculado : montoTotal),
      items:             ventaId ? [] : items,
    }
    startTransition(async () => {
      const res = await crearRemito(input)
      if ('error' in res) {
        setError(res.error ?? null)
      } else {
        router.push(`/remitos/${res.remitoId}`)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="px-4 py-3 bg-danger-soft border border-danger-border rounded-[var(--radius-md)] text-sm text-danger-soft-fg">
          {error}
        </div>
      )}

      {/* Tipo de remito */}
      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
        <div className="px-5 py-3 border-b border-border-subtle">
          <p className="text-[11px] uppercase tracking-[0.07em] font-semibold text-fg-subtle">Tipo de remito</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex gap-3">
            {(['entrega', 'cuenta_corriente'] as TipoRemito[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`flex-1 py-2.5 rounded-[var(--radius-lg)] text-[13px] font-semibold border transition-colors ${
                  tipo === t
                    ? 'bg-fg text-white border-fg'
                    : 'bg-surface text-fg-muted border-border-default hover:border-border-default'
                }`}
              >
                {t === 'entrega' ? '✓ Entrega (ya cobrado)' : '$ Cuenta corriente (a cobrar)'}
              </button>
            ))}
          </div>
          {tipo === 'cuenta_corriente' && (
            <p className="text-[12px] text-warning-soft-fg bg-warning-soft border border-warning-border rounded-[var(--radius-md)] px-3 py-2">
              Este remito quedará pendiente de cobro. Podés registrar el pago desde el detalle.
            </p>
          )}
        </div>
      </div>

      {/* Venta asociada */}
      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
        <div className="px-5 py-3 border-b border-border-subtle">
          <p className="text-[11px] uppercase tracking-[0.07em] font-semibold text-fg-subtle">Venta y cliente</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-fg mb-1.5">
              Venta asociada <span className="text-fg-subtle font-normal">(opcional)</span>
            </label>
            <select value={ventaId} onChange={(e) => setVentaId(e.target.value)} className={INPUT_CLS}>
              <option value="">Sin venta asociada (items manuales)</option>
              {ventas.map((v) => (
                <option key={v.id} value={v.id}>
                  #{v.numero_ticket} — {formatDate(v.created_at)}
                  {v.cliente_nombre ? ` — ${v.cliente_nombre}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-fg mb-1.5">
              Cliente CRM <span className="text-fg-subtle font-normal">(opcional)</span>
            </label>
            <select value={clienteId} onChange={(e) => handleClienteChange(e.target.value)} className={INPUT_CLS}>
              <option value="">— Sin cliente —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {[c.nombre, c.apellido].filter(Boolean).join(' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Destinatario */}
      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
        <div className="px-5 py-3 border-b border-border-subtle">
          <p className="text-[11px] uppercase tracking-[0.07em] font-semibold text-fg-subtle">Destinatario</p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-fg mb-1.5">Nombre / Razón social *</label>
            <input type="text" value={destinatario} onChange={(e) => setDestinatario(e.target.value)} placeholder="Nombre o razón social" className={INPUT_CLS} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-fg mb-1.5">Dirección de entrega</label>
              <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle 123, Barrio" className={INPUT_CLS} />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-fg mb-1.5">Teléfono</label>
              <input type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+54 9 299 XXX-XXXX" className={INPUT_CLS} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-fg mb-1.5">Fecha estimada de entrega</label>
              <input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} className={INPUT_CLS} />
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-fg mb-1.5">Observaciones</label>
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} placeholder="Indicaciones especiales…" className={`${INPUT_CLS} resize-none`} />
          </div>
        </div>
      </div>

      {/* Items (solo si no hay venta asociada) */}
      {!ventaId && (
        <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden shadow-[0_1px_3px_0_rgb(0,0,0,0.06)]">
          <div className="px-5 py-3 border-b border-border-subtle">
            <p className="text-[11px] uppercase tracking-[0.07em] font-semibold text-fg-subtle">Ítems del remito</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    className="col-span-4 border border-border-default rounded-[var(--radius-md)] px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Producto"
                    value={it.nombre_producto}
                    onChange={(e) => updateItem(idx, 'nombre_producto', e.target.value)}
                  />
                  <input
                    className="col-span-2 border border-border-default rounded-[var(--radius-md)] px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Talla"
                    value={it.talla ?? ''}
                    onChange={(e) => updateItem(idx, 'talla', e.target.value || null)}
                  />
                  <input
                    className="col-span-2 border border-border-default rounded-[var(--radius-md)] px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Color"
                    value={it.color ?? ''}
                    onChange={(e) => updateItem(idx, 'color', e.target.value || null)}
                  />
                  <input
                    type="number" min="1"
                    className="col-span-1 border border-border-default rounded-[var(--radius-md)] px-2 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40 text-center tabular-nums"
                    value={it.cantidad}
                    onChange={(e) => updateItem(idx, 'cantidad', Math.max(1, Number(e.target.value)))}
                  />
                  <input
                    type="number" min="0" step="0.01"
                    className="col-span-2 border border-border-default rounded-[var(--radius-md)] px-2.5 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/40 text-right tabular-nums"
                    placeholder="Precio"
                    value={it.precio_unitario || ''}
                    onChange={(e) => updateItem(idx, 'precio_unitario', Number(e.target.value))}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    className="col-span-1 flex items-center justify-center h-8 w-8 rounded-[var(--radius-md)] text-fg-subtle hover:text-danger-soft-fg hover:bg-danger-soft transition disabled:opacity-30"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addItem}
              className="text-[13px] text-fg-brand hover:text-primary-soft-fg font-semibold"
            >
              + Agregar ítem
            </button>
            {tipo === 'cuenta_corriente' && totalCalculado > 0 && (
              <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                <span className="text-[13px] text-fg-muted">Total a cobrar</span>
                <span className="text-[16px] font-bold text-fg tabular-nums">
                  ${totalCalculado.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="h-10 px-5 bg-fg text-white text-sm font-semibold rounded-[var(--radius-full)] hover:bg-fg-muted transition disabled:opacity-50"
        >
          {isPending ? 'Creando…' : 'Crear remito'}
        </button>
        <Link
          href="/remitos"
          className="h-10 px-5 border border-border-default text-fg text-sm font-medium rounded-[var(--radius-full)] hover:bg-surface-hover transition inline-flex items-center"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
