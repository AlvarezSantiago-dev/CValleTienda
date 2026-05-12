'use client'

import type { MetodoPago } from '@/lib/configuracion/queries'

export interface PagoLinea {
  id: string
  metodo_pago_id: string
  monto: number
  referencia: string
}

interface PagoMultiMetodoProps {
  metodos: MetodoPago[]
  pagos: PagoLinea[]
  total: number
  onChange: (pagos: PagoLinea[]) => void
}

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(n)
}

function nuevoId() {
  return Math.random().toString(36).slice(2, 10)
}

export function PagoMultiMetodo({
  metodos,
  pagos,
  total,
  onChange,
}: PagoMultiMetodoProps) {
  const cobrado = pagos.reduce((acc, p) => acc + (Number(p.monto) || 0), 0)
  const resta = Math.max(0, total - cobrado)
  const vuelto = Math.max(0, cobrado - total)

  function add(metodoId?: string) {
    const m = metodoId ?? metodos[0]?.id
    if (!m) return
    onChange([
      ...pagos,
      {
        id: nuevoId(),
        metodo_pago_id: m,
        monto: resta > 0 ? Math.round(resta * 100) / 100 : 0,
        referencia: '',
      },
    ])
  }

  function update(id: string, patch: Partial<PagoLinea>) {
    onChange(pagos.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function remove(id: string) {
    onChange(pagos.filter((p) => p.id !== id))
  }

  function autoCompletar() {
    if (pagos.length === 0) {
      add()
      return
    }
    const last = pagos[pagos.length - 1]
    update(last.id, { monto: Math.round((Number(last.monto) + resta) * 100) / 100 })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Pagos</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => add()}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
          >
            + Agregar pago
          </button>
          {resta > 0 && (
            <button
              type="button"
              onClick={autoCompletar}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              Auto-completar
            </button>
          )}
        </div>
      </div>

      {pagos.length === 0 ? (
        <p className="text-xs text-gray-500 italic">Agregá al menos un pago.</p>
      ) : (
        <div className="space-y-2">
          {pagos.map((p) => {
            const m = metodos.find((x) => x.id === p.metodo_pago_id)
            const requiereRef = m && (m.cuenta_fondo?.tipo ?? '') !== 'efectivo'
            return (
              <div
                key={p.id}
                className="grid grid-cols-12 gap-2 items-start bg-gray-50 border border-gray-200 rounded-lg p-2"
              >
                <select
                  value={p.metodo_pago_id}
                  onChange={(e) => update(p.id, { metodo_pago_id: e.target.value })}
                  className="col-span-5 h-9 px-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  {metodos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                      {m.comision_porcentaje > 0 ? ` (${m.comision_porcentaje}%)` : ''}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={p.monto}
                  onChange={(e) =>
                    update(p.id, { monto: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="col-span-3 h-9 px-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 text-right"
                  placeholder="Monto"
                />
                <input
                  type="text"
                  value={p.referencia}
                  onChange={(e) => update(p.id, { referencia: e.target.value })}
                  placeholder={requiereRef ? 'Referencia (opcional)' : 'Ref'}
                  className="col-span-3 h-9 px-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="col-span-1 h-9 text-red-600 hover:text-red-800 text-lg"
                  aria-label="Eliminar pago"
                >
                  ×
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-gray-200">
        <div>
          <p className="text-gray-500">Cobrado</p>
          <p className="font-semibold text-gray-900">{formatARS(cobrado)}</p>
        </div>
        <div>
          <p className="text-gray-500">Resta</p>
          <p
            className={`font-semibold ${
              resta > 0 ? 'text-amber-700' : 'text-green-700'
            }`}
          >
            {formatARS(resta)}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Vuelto</p>
          <p
            className={`font-semibold ${
              vuelto > 0 ? 'text-blue-700' : 'text-gray-900'
            }`}
          >
            {formatARS(vuelto)}
          </p>
        </div>
      </div>
    </div>
  )
}
