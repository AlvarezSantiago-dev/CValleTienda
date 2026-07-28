'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { nombreUsuario, type MovimientoTurno } from '@/lib/caja/types'
import { labelTipoCuenta } from '@/lib/caja/labels'
import { formatDateTime } from '@/lib/format'
import { formatARS } from '@/lib/format-moneda'
import { eliminarMovimientoCaja } from '@/app/actions/caja'
import { EditarMovimientoForm } from '@/components/caja/EditarMovimientoForm'
import type { CuentaOpcion } from '@/components/caja/RegistrarMovimientoForm'

interface Props {
  movimientos: MovimientoTurno[]
  editable?: boolean
  cuentas?: CuentaOpcion[]
  titulo?: string
}

export function MovimientosTurnoTabla({
  movimientos,
  editable = false,
  cuentas = [],
  titulo = 'Movimientos del turno',
}: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [editando, setEditando] = useState<MovimientoTurno | null>(null)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  function handleEliminar(m: MovimientoTurno) {
    const ok = window.confirm(
      `¿Eliminar el ${m.tipo} “${m.concepto}” por ${formatARS(m.monto)}?`
    )
    if (!ok) return
    setErrorAccion(null)
    setEliminandoId(m.id)
    startTransition(async () => {
      const res = await eliminarMovimientoCaja(m.id)
      setEliminandoId(null)
      if (!res.ok) {
        setErrorAccion(res.error ?? 'No se pudo eliminar el movimiento')
        return
      }
      router.refresh()
    })
  }

  if (movimientos.length === 0) {
    return (
      <section>
        <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-gray-400 mb-2">
          {titulo}
        </h3>
        <p className="text-[13px] text-gray-400 italic">Todavía no hay movimientos en este turno.</p>
      </section>
    )
  }

  return (
    <section>
      <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-gray-400 mb-2">
        {titulo}
      </h3>
      {errorAccion && (
        <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errorAccion}
        </div>
      )}
      <div className="rounded-xl border border-gray-100 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 text-left">
              <th className="px-4 py-2.5">Fecha</th>
              <th className="px-4 py-2.5">Tipo</th>
              <th className="px-4 py-2.5">Concepto</th>
              <th className="px-4 py-2.5">Cuenta</th>
              <th className="px-4 py-2.5">Usuario</th>
              <th className="px-4 py-2.5 text-right">Monto</th>
              {editable && <th className="px-4 py-2.5 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {movimientos.map((m) => {
              const autor = nombreUsuario(m.usuario)
              return (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-[12px] text-gray-500 whitespace-nowrap">
                    {formatDateTime(m.created_at)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        m.tipo === 'ingreso'
                          ? 'bg-lime-50 text-lime-700 border border-lime-200'
                          : m.tipo === 'egreso'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {m.tipo === 'ingreso' ? 'Ingreso' : m.tipo === 'egreso' ? 'Egreso' : 'Ajuste'}
                      {!m.es_manual && ' · venta'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[13px] text-gray-700">{m.concepto}</td>
                  <td className="px-4 py-2.5 text-[12px] text-gray-500">
                    {m.nombre_cuenta}
                    {m.tipo_cuenta ? (
                      <span className="text-gray-400 ml-1">({labelTipoCuenta(m.tipo_cuenta)})</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-gray-500">
                    {autor ?? (m.es_manual ? '—' : 'Sistema')}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[13px] font-semibold tabular-nums">
                    {m.tipo === 'egreso' ? '−' : '+'}
                    {formatARS(m.monto)}
                  </td>
                  {editable && (
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      {m.es_manual && m.tipo !== 'ajuste' ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setErrorAccion(null)
                              setEditando(m)
                            }}
                            disabled={isPending}
                            className="text-xs font-medium text-lime-700 hover:text-lime-800 hover:underline disabled:opacity-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminar(m)}
                            disabled={isPending}
                            className="text-xs font-medium text-red-600 hover:text-red-700 hover:underline disabled:opacity-50"
                          >
                            {eliminandoId === m.id ? '…' : 'Eliminar'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-300">—</span>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editando && (
        <EditarMovimientoForm
          movimiento={editando}
          cuentas={cuentas}
          onSuccess={() => setEditando(null)}
          onCancel={() => setEditando(null)}
        />
      )}
    </section>
  )
}
