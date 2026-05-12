'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { VentaParaDevolucion } from '@/lib/ventas/queries'
import type { MetodoPago } from '@/lib/configuracion/queries'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { PagoMultiMetodo, type PagoLinea } from '@/components/pos/PagoMultiMetodo'
import { registrarDevolucion } from '@/app/actions/devoluciones'

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
      }))
  )

  const [pagos, setPagos] = useState<PagoLinea[]>([])
  const [tipoResolucion, setTipoResolucion] = useState<'reembolso' | 'saldo_a_favor' | 'cambio'>('reembolso')

  const total = useMemo(() => {
    return round2(
      lineas.reduce((acc, l) => acc + l.cantidad * l.precio_unitario, 0)
    )
  }, [lineas])

  const sumaPagos = useMemo(
    () => round2(pagos.reduce((acc, p) => acc + (Number(p.monto) || 0), 0)),
    [pagos]
  )

  const cantSeleccionadas = lineas.reduce((acc, l) => acc + l.cantidad, 0)

  const puedeEnviar =
    cantSeleccionadas > 0 &&
    motivo.trim().length > 0 &&
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
      .map((l) => ({
        detalle_venta_id: l.detalle_venta_id,
        cantidad: l.cantidad,
      }))

    const pagosInput = pagos.map((p) => ({
      metodo_pago_id: p.metodo_pago_id,
      monto: Number(p.monto),
      referencia: p.referencia || null,
    }))

    startTransition(async () => {
      const res = await registrarDevolucion({
        venta_id: venta.id,
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
      <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center text-sm text-gray-500">
        Esta venta ya tiene todos sus ítems devueltos. No hay nada por devolver.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Selección de líneas */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-[#0A0A0A]">Ítems a devolver</h2>
          <p className="text-[13px] text-gray-400 mt-0.5">
            Solo se muestran ítems con saldo disponible.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
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
                      <div className="font-medium text-gray-900">{l.nombre_producto}</div>
                      {(l.talla || l.color) && (
                        <div className="text-xs text-gray-500">
                          {[l.talla, l.color].filter(Boolean).join(' / ')}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">
                      {l.disponible}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">
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
                          className="w-20 h-8 px-2 border border-gray-200 rounded-md text-sm text-right focus:ring-2 focus:ring-lime-400/60"
                        />
                        <button
                          type="button"
                          onClick={() => todoElDisponible(l.detalle_venta_id)}
                          className="text-xs text-lime-700 hover:underline"
                        >
                          Todo
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">
                      {formatARS(subtotal)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-100">
              <tr>
                <td colSpan={4} className="px-3 py-2 text-right font-semibold text-gray-700">
                  Total a devolver
                </td>
                <td className="px-3 py-2 text-right text-lg font-bold text-lime-800">
                  {formatARS(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Tipo de resolución */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          ¿Cómo se resuelve la devolución?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { value: 'reembolso', label: 'Reembolso de dinero', desc: 'Se devuelve el importe al cliente por el medio de pago elegido' },
            { value: 'saldo_a_favor', label: 'Saldo a favor', desc: 'El importe queda acreditado para la próxima compra' },
            { value: 'cambio', label: 'Cambio de producto', desc: 'Solo repone el stock, sin movimiento de dinero' },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTipoResolucion(opt.value)}
              className={`text-left border rounded-xl p-3 transition-colors ${
                tipoResolucion === opt.value
                  ? 'border-lime-500 bg-lime-50 ring-1 ring-lime-500'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-semibold text-sm text-[#0A0A0A]">{opt.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
            </button>
          ))}
        </div>
        {tipoResolucion === 'saldo_a_favor' && !venta.cliente_id && (
          <p className="mt-2 text-xs text-amber-700">
            ⚠️ Esta venta no tiene cliente asociado. El saldo a favor requiere un cliente.
          </p>
        )}
      </div>

      {/* Motivo */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
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
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <PagoMultiMetodo
            metodos={metodos}
            pagos={pagos}
            total={total}
            onChange={setPagos}
          />
          {Math.abs(sumaPagos - total) > 0.01 && total > 0 && (
            <p className="mt-2 text-xs text-amber-700">
              Los pagos suman {formatARS(sumaPagos)} pero el total a devolver es{' '}
              {formatARS(total)}. Ajustá los montos.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
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
