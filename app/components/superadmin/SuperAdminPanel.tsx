'use client'

import { useState } from 'react'
import { cambiarPlan, extenderTrial, marcarSolicitudAtendida } from '@/app/actions/superadmin'
import type { PlanTipo } from '@/lib/planes/config'

// ----------------------------------------------------------------
// Tipos — coinciden con lo que devuelve la page
// ----------------------------------------------------------------
interface TiendaRow {
  id: string
  nombre: string
  rubro: string
  plan: PlanTipo
  trial_hasta: string | null
  plan_activo_desde: string | null
  solicitudes_pendientes: number
}

interface SolicitudRow {
  id: string
  tienda_id: string
  tienda_nombre: string
  mensaje: string | null
  created_at: string
}

// ----------------------------------------------------------------
// Componente principal
// ----------------------------------------------------------------
export function SuperAdminPanel({
  tiendas,
  solicitudes,
}: {
  tiendas: TiendaRow[]
  solicitudes: SolicitudRow[]
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function run(label: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setLoading(label)
    setMsg(null)
    const res = await fn()
    setMsg(res.ok ? '✓ Listo' : `Error: ${res.error}`)
    setLoading(null)
    // Recarga para reflejar cambios
    if (res.ok) setTimeout(() => window.location.reload(), 800)
  }

  function fmt(dt: string | null) {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  return (
    <div className="space-y-8">
      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${
          msg.startsWith('✓')
            ? 'bg-lime-50 border border-lime-200 text-lime-800'
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {msg}
        </div>
      )}

      {/* Solicitudes pendientes */}
      {solicitudes.length > 0 && (
        <div>
          <h2 className="text-[16px] font-semibold text-[#0A0A0A] mb-3">
            Solicitudes de upgrade pendientes ({solicitudes.length})
          </h2>
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">Tienda</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">Mensaje</th>
                  <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">Fecha</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {solicitudes.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-[#0A0A0A]">{s.tienda_nombre}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{s.mensaje ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{fmt(s.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        disabled={loading === `atender-${s.id}`}
                        onClick={() =>
                          run(`atender-${s.id}`, () =>
                            marcarSolicitudAtendida(s.id)
                          )
                        }
                        className="border border-gray-200 rounded-full h-8 px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Marcar atendida
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tabla de tiendas */}
      <div>
        <h2 className="text-[16px] font-semibold text-[#0A0A0A] mb-3">
          Tiendas ({tiendas.length})
        </h2>
        <div className="bg-white border border-gray-100 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">Nombre</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">Rubro</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">Plan</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">Trial hasta</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">Pro desde</th>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400">Solicitudes</th>
                <th className="px-4 py-3 text-[10px] uppercase tracking-[0.08em] font-semibold text-gray-400 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tiendas.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-[#0A0A0A]">{t.nombre}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{t.rubro}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      t.plan === 'pro'
                        ? 'bg-lime-50 border border-lime-200 text-lime-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {t.plan.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{fmt(t.trial_hasta)}</td>
                  <td className="px-4 py-3 text-gray-400">{fmt(t.plan_activo_desde)}</td>
                  <td className="px-4 py-3">
                    {t.solicitudes_pendientes > 0 && (
                      <span className="bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-bold rounded-full">
                        {t.solicitudes_pendientes}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end flex-wrap">
                      <button
                        disabled={!!loading}
                        onClick={() =>
                          run(`pro-${t.id}`, () => cambiarPlan(t.id, 'pro'))
                        }
                        className="border border-gray-200 rounded-full h-7 px-2.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
                      >
                        Activar Pro
                      </button>
                      <button
                        disabled={!!loading}
                        onClick={() =>
                          run(`basico-${t.id}`, () => cambiarPlan(t.id, 'basico'))
                        }
                        className="border border-gray-200 rounded-full h-7 px-2.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
                      >
                        Bajar a Básico
                      </button>
                      <button
                        disabled={!!loading}
                        onClick={() =>
                          run(`trial-${t.id}`, () => extenderTrial(t.id, 30))
                        }
                        className="border border-gray-200 rounded-full h-7 px-2.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
                      >
                        +30 días trial
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
