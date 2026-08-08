'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { VentaParaDevolucion } from '@/lib/ventas/queries'
import type { MetodoPago } from '@/lib/configuracion/queries'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { PagoMultiMetodo, type PagoLinea } from '@/components/pos/PagoMultiMetodo'
import { ClienteSelector } from '@/components/clientes/ClienteSelector'
import type { ClienteLite } from '@/app/actions/ventas'
import { registrarDevolucion } from '@/app/actions/devoluciones'
import { CambioVariantePanel } from '@/components/devoluciones/CambioVariantePanel'
import type { CambioLineaState } from '@/lib/devoluciones/cambio-variante'

interface DevolucionFormProps {
  venta: VentaParaDevolucion
  metodos: MetodoPago[]
}

interface LineaState {
  detalle_venta_id: string
  cantidad: number
  precio_unitario: number
  nombre_producto: string
  talla: string | null
  color: string | null
  disponible: number
  producto_id: string | null
  es_kit_o_bundle: boolean
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

function round2(n: number) {
  return Math.round(n * 100) / 100
}

export function DevolucionForm({ venta, metodos }: DevolucionFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')

  const [lineas, setLineas] = useState<LineaState[]>(() =>
    venta.detalles
      .filter((d) => d.disponible_devolver > 0)
      .map((d) => ({
        detalle_venta_id: d.id,
        cantidad: 0,
        precio_unitario: d.precio_unitario,
        nombre_producto: d.nombre_producto,
        talla: d.talla,
        color: d.color,
        disponible: d.disponible_devolver,
        producto_id: d.producto_id,
        es_kit_o_bundle: d.es_kit_o_bundle,
      }))
  )

  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteLite | null>(() =>
    venta.cliente_id
      ? {
          id: venta.cliente_id,
          nombre: venta.cliente_nombre ?? 'Cliente',
          apellido: null,
          dni: venta.cliente_dni ?? null,
          telefono: venta.cliente_telefono ?? null,
          saldo_favor: 0,
        }
      : null
  )

  const [pagos, setPagos] = useState<PagoLinea[]>([])
  const [tipoResolucion, setTipoResolucion] = useState<'reembolso' | 'saldo_a_favor' | 'cambio'>('reembolso')
  const [cambioPorLinea, setCambioPorLinea] = useState<Record<string, CambioLineaState>>({})

  const total = useMemo(() => {
    // Misma regla que ventas/POS: round2 por línea, luego sumar
    return round2(lineas.reduce((acc, l) => acc + round2(l.cantidad * l.precio_unitario), 0))
  }, [lineas])

  const sumaPagos = useMemo(
    () => round2(pagos.reduce((acc, p) => acc + (Number(p.monto) || 0), 0)),
    [pagos]
  )

  const cantSeleccionadas = lineas.reduce((acc, l) => acc + l.cantidad, 0)

  const lineasConCantidad = useMemo(
    () => lineas.filter((l) => l.cantidad > 0),
    [lineas]
  )

  const cambioValido = useMemo(() => {
    if (tipoResolucion !== 'cambio') return true
    for (const l of lineasConCantidad) {
      const st = cambioPorLinea[l.detalle_venta_id] ?? { subtipo: 'misma_variante' as const }
      if (st.subtipo === 'otra_variante' && !st.variante_entrega_id) {
        return false
      }
    }
    return true
  }, [tipoResolucion, lineasConCantidad, cambioPorLinea])

  const puedeEnviar =
    cantSeleccionadas > 0 &&
    motivo.trim().length > 0 &&
    cambioValido &&
    (tipoResolucion !== 'saldo_a_favor' || !!venta.cliente_id || !!clienteSeleccionado) &&
    (tipoResolucion !== 'reembolso' ||
      (pagos.length > 0 && Math.abs(sumaPagos - total) < 0.01))

  function setCantidad(detalleId: string, cant: number) {
    setLineas((prev) =>
      prev.map((l) => {
        if (l.detalle_venta_id !== detalleId) return l
        const c = Math.max(0, Math.min(l.disponible, Math.floor(cant)))
        return { ...l, cantidad: c }
      })
    )
  }

  function todoElDisponible(detalleId: string) {
    setLineas((prev) =>
      prev.map((l) =>
        l.detalle_venta_id === detalleId ? { ...l, cantidad: l.disponible } : l
      )
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const lineasInput = lineas
      .filter((l) => l.cantidad > 0)
      .map((l) => {
        const base = {
          detalle_venta_id: l.detalle_venta_id,
          cantidad: l.cantidad,
        }
        if (tipoResolucion !== 'cambio') return base
        const st = cambioPorLinea[l.detalle_venta_id] ?? { subtipo: 'misma_variante' as const }
        return {
          ...base,
          subtipo_cambio: st.subtipo,
          variante_entrega_id:
            st.subtipo === 'otra_variante' ? st.variante_entrega_id ?? null : null,
        }
      })

    const pagosInput = pagos.map((p) => ({
      metodo_pago_id: p.metodo_pago_id,
      monto: Number(p.monto),
      referencia: p.referencia || null,
    }))

    startTransition(async () => {
      const res = await registrarDevolucion({
        venta_id: venta.id,
        cliente_id: clienteSeleccionado?.id ?? null,
        motivo,
        tipo_resolucion: tipoResolucion,
        lineas: lineasInput,
        pagos: tipoResolucion === 'reembolso' ? pagosInput : [],
      })
      if (!res.ok || !res.data) {
        setError(res.error ?? 'Error desconocido')
        return
      }
      router.push(`/devoluciones/${res.data.id}`)
      router.refresh()
    })
  }

  if (lineas.length === 0) {
    return (
      <div className="bg-surface border border-dashed border-border-default rounded-[var(--radius-lg)] p-8 text-center text-sm text-fg-muted">
        Esta venta ya tiene todos sus ítems devueltos. No hay nada por devolver.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selección de líneas */}
      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle">
          <h2 className="text-base font-semibold text-fg">Ítems a devolver</h2>
          <p className="text-[13px] text-fg-subtle mt-0.5">
            Solo se muestran ítems con saldo disponible.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-sunken text-fg-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Producto</th>
                <th className="px-3 py-2 text-right font-medium">Disponible</th>
                <th className="px-3 py-2 text-right font-medium">Precio</th>
                <th className="px-3 py-2 text-right font-medium">Cantidad</th>
                <th className="px-3 py-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lineas.map((l) => {
                const subtotal = round2(l.cantidad * l.precio_unitario)
                return (
                  <tr key={l.detalle_venta_id}>
                    <td className="px-3 py-2">
                      <div className="font-medium text-fg">{l.nombre_producto}</div>
                      {(l.talla || l.color) && (
                        <div className="text-xs text-fg-muted">
                          {[l.talla, l.color].filter(Boolean).join(' / ')}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-fg">
                      {l.disponible}
                    </td>
                    <td className="px-3 py-2 text-right text-fg">
                      {formatARS(l.precio_unitario)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={l.disponible}
                          step={1}
                          value={l.cantidad}
                          onChange={(e) =>
                            setCantidad(l.detalle_venta_id, Number(e.target.value) || 0)
                          }
                          className="w-20 h-8 px-2 border border-border-default rounded-md text-sm text-right focus:ring-2 focus:ring-primary/40"
                        />
                        <button
                          type="button"
                          onClick={() => todoElDisponible(l.detalle_venta_id)}
                          className="text-xs text-fg-brand hover:underline"
                        >
                          Todo
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-fg">
                      {formatARS(subtotal)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-surface-sunken border-t border-border-subtle">
              <tr>
                <td colSpan={4} className="px-3 py-2 text-right font-semibold text-fg">
                  Total a devolver
                </td>
                <td className="px-3 py-2 text-right text-lg font-bold text-primary-soft-fg">
                  {formatARS(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Tipo de resolución */}
      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-5">
        <label className="block text-sm font-medium text-fg mb-3">
          ¿Cómo se resuelve la devolución?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { value: 'reembolso', label: 'Reembolso de dinero', desc: 'Se devuelve el importe al cliente por el medio de pago elegido. Sale dinero de la caja.' },
            { value: 'saldo_a_favor', label: 'Saldo a favor', desc: 'El importe queda acreditado para la próxima compra. No sale dinero de la caja.' },
            { value: 'cambio', label: 'Cambio de producto', desc: 'Repone lo devuelto y registra lo entregado en un solo paso. Sin movimiento de dinero si es la misma variante o mismo precio.' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTipoResolucion(opt.value)}
              className={`text-left border rounded-[var(--radius-lg)] p-3 transition-colors ${
                tipoResolucion === opt.value
                  ? 'border-primary bg-primary-soft ring-1 ring-primary'
                  : 'border-border-default hover:border-border-default'
              }`}
            >
              <div className="font-semibold text-sm text-fg">{opt.label}</div>
              <div className="text-xs text-fg-muted mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
        {tipoResolucion === 'saldo_a_favor' && (
          <p className="mt-2 text-xs text-success-soft-fg bg-success-soft border border-emerald-100 rounded-[var(--radius-md)] px-3 py-2">
            💡 Si el cliente se lleva otro producto ahora (por ej. cambio de talle o color),
            usá <strong>Cambio de producto</strong>: queda registrado en un solo paso y no
            genera una venta nueva. Elegí saldo a favor solo si el crédito se va a usar
            en una compra futura.
          </p>
        )}
        {tipoResolucion === 'saldo_a_favor' && !venta.cliente_id && (
          <p className="mt-2 text-xs text-warning-soft-fg">
            ⚠️ Esta venta no tiene cliente asociado. El saldo a favor requiere un cliente.
          </p>
        )}
      </div>

      {tipoResolucion === 'cambio' && lineasConCantidad.length > 0 && (
        <CambioVariantePanel
          lineas={lineasConCantidad.map((l) => ({
            detalle_venta_id: l.detalle_venta_id,
            cantidad: l.cantidad,
            nombre_producto: l.nombre_producto,
            talla: l.talla,
            color: l.color,
            precio_unitario: l.precio_unitario,
            producto_id: l.producto_id,
            es_kit_o_bundle: l.es_kit_o_bundle,
          }))}
          cambioPorLinea={cambioPorLinea}
          onChange={(id, next) =>
            setCambioPorLinea((prev) => ({ ...prev, [id]: next }))
          }
        />
      )}

      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-5">
        <p className="text-[11px] uppercase tracking-[0.07em] font-semibold text-fg-subtle mb-3">
          Cliente {venta.cliente_id ? '(asociado a la venta)' : '(opcional)'}
        </p>
        {venta.cliente_id ? (
          <div className="bg-primary-soft border border-primary-border rounded-[var(--radius-md)] px-4 py-3 text-sm text-fg">
            <p className="font-medium">{venta.cliente_nombre}</p>
            {(venta.cliente_dni || venta.cliente_telefono) && (
              <p className="text-xs text-fg-muted mt-1">
                {[venta.cliente_dni, venta.cliente_telefono].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
        ) : (
          <ClienteSelector
            value={clienteSeleccionado}
            onChange={setClienteSeleccionado}
          />
        )}
        {tipoResolucion === 'saldo_a_favor' && !venta.cliente_id && !clienteSeleccionado && (
          <p className="mt-2 text-xs text-warning-soft-fg">
            ⚠️ Para saldo a favor necesitás seleccionar o crear un cliente.
          </p>
        )}
      </div>

      {/* Motivo */}
      <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-5">
        <Textarea
          label="Motivo de la devolución *"
          rows={3}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ej: el cliente cambió de talle, defecto de fábrica, no le quedó bien…"
          required
        />
      </div>

      {/* Pagos — solo para reembolso */}
      {tipoResolucion === 'reembolso' && (
        <div className="bg-surface border border-border-subtle rounded-[var(--radius-lg)] p-5">
          <PagoMultiMetodo
            metodos={metodos}
            pagos={pagos}
            total={total}
            onChange={setPagos}
          />
          {Math.abs(sumaPagos - total) > 0.01 && total > 0 && (
            <p className="mt-2 text-xs text-warning-soft-fg">
              Los pagos suman {formatARS(sumaPagos)} pero el total a devolver es{' '}
              {formatARS(total)}. Ajustá los montos.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-[var(--radius-md)] border border-danger-border bg-danger-soft p-3 text-sm text-danger-soft-fg">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={!puedeEnviar || isPending}>
          {isPending ? 'Procesando…' : `Registrar devolución por ${formatARS(total)}`}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
