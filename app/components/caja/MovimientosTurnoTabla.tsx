'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { nombreUsuario, type MovimientoTurno } from '@/lib/caja/types'
import { labelTipoCuenta } from '@/lib/caja/labels'
import { formatDateTime } from '@/lib/format'
import { formatARS } from '@/lib/format-moneda'
import { Badge } from '@/components/ui/Badge'
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
        {titulo ? (
          <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-fg-subtle mb-2">
            {titulo}
          </h3>
        ) : null}
        <p className="text-[13px] text-fg-subtle italic">Todavía no hay movimientos en este turno.</p>
      </section>
    )
  }

  return (
    <section>
      {titulo ? (
        <h3 className="text-[11px] uppercase tracking-[0.10em] font-semibold text-fg-subtle mb-2">
          {titulo}
        </h3>
      ) : null}
      {errorAccion && (
        <div className="mb-2 rounded-[var(--radius-md)] border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger-soft-fg">
          {errorAccion}
        </div>
      )}
      <div className="rounded-[var(--radius-lg)] border border-border-subtle overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-surface-sunken">
            <tr className="text-[10px] uppercase tracking-[0.08em] font-semibold text-fg-subtle text-left">
              <th className="px-4 py-2.5">Fecha</th>
              <th className="px-4 py-2.5">Tipo</th>
              <th className="px-4 py-2.5">Concepto</th>
              <th className="px-4 py-2.5">Cuenta</th>
              <th className="px-4 py-2.5">Usuario</th>
              <th className="px-4 py-2.5 text-right">Monto</th>
              {editable && <th className="px-4 py-2.5 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {movimientos.map((m) => {
              const autor = nombreUsuario(m.usuario)
              return (
                <tr key={m.id} className="hover:bg-surface-hover">
                  <td className="px-4 py-2.5 text-[12px] text-fg-muted whitespace-nowrap">
                    {formatDateTime(m.created_at)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant={
                        m.tipo === 'ingreso' ? 'brand' : m.tipo === 'egreso' ? 'danger' : 'neutral'
                      }
                    >
                      {m.tipo === 'ingreso' ? 'Ingreso' : m.tipo === 'egreso' ? 'Egreso' : 'Ajuste'}
                      {!m.es_manual && ' · venta'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-[13px] text-fg">{m.concepto}</td>
                  <td className="px-4 py-2.5 text-[12px] text-fg-muted">
                    {m.nombre_cuenta}
                    {m.tipo_cuenta ? (
                      <span className="text-fg-subtle ml-1">({labelTipoCuenta(m.tipo_cuenta)})</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-fg-muted">
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
                            className="text-xs font-medium text-fg-brand hover:text-primary-soft-fg hover:underline disabled:opacity-50"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminar(m)}
                            disabled={isPending}
                            className="text-xs font-medium text-danger-soft-fg hover:text-danger-soft-fg hover:underline disabled:opacity-50"
                          >
                            {eliminandoId === m.id ? '…' : 'Eliminar'}
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-fg-subtle">—</span>
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
