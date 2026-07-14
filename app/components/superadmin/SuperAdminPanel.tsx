'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  cambiarPlan,
  extenderTrial,
  setTrialFecha,
  renovarAcceso,
  setAccesoHasta,
  marcarSolicitudAtendida,
} from '@/app/actions/superadmin'
import { getPlanEfectivo, diasRestantesTrial } from '@/lib/planes/config'
import {
  estadoAcceso,
  diasRestantesAcceso,
  type EstadoAcceso,
} from '@/lib/planes/acceso'
import type { PlanTipo } from '@/lib/planes/config'

interface TiendaRow {
  id: string
  nombre: string
  rubro: string
  plan: PlanTipo
  trial_hasta: string | null
  plan_activo_desde: string | null
  acceso_hasta: string | null
  ultimo_pago_at: string | null
  created_at: string
  solicitudes_pendientes: number
  owner: { nombre: string; apellido: string | null } | null
}

interface SolicitudRow {
  id: string
  tienda_id: string
  tienda_nombre: string
  mensaje: string | null
  created_at: string
}

function fmtDate(iso: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-AR', opts ?? { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function isoDateInput(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 10)
}

function toISOFromInput(val: string): string | null {
  if (!val) return null
  return new Date(val + 'T00:00:00').toISOString()
}

function AccesoBadge({
  plan,
  trial_hasta,
  acceso_hasta,
}: {
  plan: PlanTipo
  trial_hasta: string | null
  acceso_hasta: string | null
}) {
  const estado = estadoAcceso({ acceso_hasta, trial_hasta })
  const diasAcceso = diasRestantesAcceso(acceso_hasta)
  const diasTrial = diasRestantesTrial(trial_hasta)
  const efectivo = getPlanEfectivo(plan, trial_hasta)

  if (estado === 'trial') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-200">
        TRIAL · {diasTrial}d
      </span>
    )
  }
  if (estado === 'vencido') {
    return (
      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-100 text-red-700 border border-red-200">
        VENCIDO
      </span>
    )
  }
  if (estado === 'por_vencer') {
    return (
      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-100 text-orange-700 border border-orange-200">
        POR VENCER · {diasAcceso}d
      </span>
    )
  }
  return (
    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
      efectivo === 'pro'
        ? 'bg-lime-50 text-lime-700 border-lime-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }`}>
      AL DÍA · {efectivo === 'pro' ? 'PRO' : 'BÁSICO'}
    </span>
  )
}

function sortKey(estado: EstadoAcceso): number {
  if (estado === 'vencido') return 0
  if (estado === 'por_vencer') return 1
  if (estado === 'trial') return 2
  return 3
}

function EditarTiendaPanel({ tienda, onDone }: { tienda: TiendaRow; onDone: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [trialDate, setTrialDate] = useState(isoDateInput(tienda.trial_hasta))
  const [accesoDate, setAccesoDate] = useState(isoDateInput(tienda.acceso_hasta))

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, label?: string) {
    startTransition(async () => {
      setFeedback(null)
      const res = await fn()
      setFeedback({ ok: res.ok, msg: res.ok ? (label ?? 'Guardado') : (res.error ?? 'Error') })
      if (res.ok) setTimeout(() => { onDone(); window.location.reload() }, 700)
    })
  }

  const esTrial = !!tienda.trial_hasta && new Date(tienda.trial_hasta) > new Date()

  return (
    <div className="border-t border-gray-100 bg-gray-50/60 px-6 py-4 space-y-5">
      {feedback && (
        <p className={`text-[12px] font-semibold ${feedback.ok ? 'text-lime-700' : 'text-red-600'}`}>
          {feedback.ok ? '✓ ' : '✗ '}{feedback.msg}
        </p>
      )}

      <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-[11px] text-blue-700 leading-relaxed">
        <strong>Plan</strong> = features. <strong>Acceso hasta</strong> = derecho a usar el sistema (mes pago).
        {esTrial
          ? <> El trial da acceso Pro hasta su vencimiento. Al vencer, corre el plan <strong>{tienda.plan}</strong> si aún hay acceso pago.</>
          : <> Sin trial activo. Si “Acceso hasta” está vencido, la tienda queda bloqueada.</>}
      </div>

      {/* Acceso / renovación */}
      <div className="space-y-3">
        <p className="text-[12px] font-bold text-gray-800 uppercase tracking-wide">Suscripción / acceso</p>
        <div className="flex items-start gap-4 flex-wrap">
          <p className="text-[12px] font-semibold text-gray-700 w-24 shrink-0 mt-1.5">Acceso hasta</p>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={accesoDate}
              onChange={e => setAccesoDate(e.target.value)}
              className="h-8 px-3 rounded-lg border border-gray-200 text-[12px] focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 bg-white"
            />
            <button
              disabled={isPending}
              onClick={() => run(() => setAccesoHasta(tienda.id, toISOFromInput(accesoDate)), 'Acceso actualizado')}
              className="h-8 px-3 rounded-lg bg-[#0A0A0A] text-white text-[12px] font-semibold hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              Guardar
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <p className="text-[12px] font-semibold text-gray-700 w-24 shrink-0">Renovar</p>
          <div className="flex gap-2">
            {[30, 60, 90].map(d => (
              <button
                key={d}
                disabled={isPending}
                onClick={() => run(() => renovarAcceso(tienda.id, d), `+${d} días de acceso`)}
                className="h-8 px-3 rounded-lg border border-lime-300 bg-lime-50 text-[12px] font-semibold text-lime-800
                           hover:bg-lime-100 disabled:opacity-40 transition-colors"
              >
                +{d}d
              </button>
            ))}
          </div>
        </div>
        {tienda.ultimo_pago_at && (
          <p className="text-[11px] text-gray-400 pl-0 sm:pl-28">
            Último pago registrado: {fmtDate(tienda.ultimo_pago_at, { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Plan base */}
      <div className="flex items-center gap-4 flex-wrap">
        <p className="text-[12px] font-semibold text-gray-700 w-24 shrink-0 leading-tight">
          {esTrial ? 'Plan al vencer trial' : 'Plan features'}
        </p>
        <div className="flex gap-2">
          <button
            disabled={isPending || tienda.plan === 'pro'}
            onClick={() => run(() => cambiarPlan(tienda.id, 'pro'), 'Plan Pro (+30d si no había acceso)')}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors disabled:opacity-40 ${
              tienda.plan === 'pro'
                ? 'bg-lime-50 border-lime-300 text-lime-700 cursor-default'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-lime-50 hover:border-lime-300 hover:text-lime-700'
            }`}
          >
            {tienda.plan === 'pro' ? '✓ Pro' : 'Activar Pro'}
          </button>
          <button
            disabled={isPending || tienda.plan === 'basico'}
            onClick={() => run(() => cambiarPlan(tienda.id, 'basico'), 'Bajado a Basico')}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-colors disabled:opacity-40 ${
              tienda.plan === 'basico'
                ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-default'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
            }`}
          >
            {tienda.plan === 'basico' ? '✓ Basico' : 'Bajar a Basico'}
          </button>
        </div>
      </div>

      {/* Trial */}
      <div className="flex items-start gap-4 flex-wrap">
        <p className="text-[12px] font-semibold text-gray-700 w-24 shrink-0 mt-1.5">Trial Pro hasta</p>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={trialDate}
            onChange={e => setTrialDate(e.target.value)}
            className="h-8 px-3 rounded-lg border border-gray-200 text-[12px] focus:outline-none focus:ring-2 focus:ring-lime-400/50 focus:border-lime-400 bg-white"
          />
          <button
            disabled={isPending}
            onClick={() => run(() => setTrialFecha(tienda.id, toISOFromInput(trialDate)), 'Trial actualizado')}
            className="h-8 px-3 rounded-lg bg-[#0A0A0A] text-white text-[12px] font-semibold hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            Guardar
          </button>
          <button
            disabled={isPending}
            onClick={() => { setTrialDate(''); run(() => setTrialFecha(tienda.id, null), 'Trial eliminado') }}
            className="h-8 px-3 rounded-lg border border-gray-200 text-[12px] text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors"
          >
            Quitar
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <p className="text-[12px] font-semibold text-gray-700 w-24 shrink-0">Extender trial</p>
        <div className="flex gap-2">
          {[7, 14, 30, 60].map(d => (
            <button
              key={d}
              disabled={isPending}
              onClick={() => run(() => extenderTrial(tienda.id, d), `+${d} días de trial`)}
              className="h-8 px-3 rounded-lg border border-gray-200 bg-white text-[12px] font-medium text-gray-700
                         hover:bg-lime-50 hover:border-lime-300 hover:text-lime-700 disabled:opacity-40 transition-colors"
            >
              +{d}d
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SuperAdminPanel({
  tiendas,
  solicitudes,
}: {
  tiendas: TiendaRow[]
  solicitudes: SolicitudRow[]
}) {
  const [expandida, setExpandida] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const ahora = new Date()

  const stats = useMemo(() => {
    let vencidos = 0
    let porVencer = 0
    let alDia = 0
    let trial = 0
    for (const t of tiendas) {
      const e = estadoAcceso({ acceso_hasta: t.acceso_hasta, trial_hasta: t.trial_hasta, now: ahora })
      if (e === 'vencido') vencidos++
      else if (e === 'por_vencer') porVencer++
      else if (e === 'trial') trial++
      else alDia++
    }
    return { vencidos, porVencer, alDia, trial }
  }, [tiendas, ahora])

  const tiendasOrdenadas = useMemo(() => {
    return [...tiendas].sort((a, b) => {
      const ea = estadoAcceso({ acceso_hasta: a.acceso_hasta, trial_hasta: a.trial_hasta, now: ahora })
      const eb = estadoAcceso({ acceso_hasta: b.acceso_hasta, trial_hasta: b.trial_hasta, now: ahora })
      const d = sortKey(ea) - sortKey(eb)
      if (d !== 0) return d
      return a.nombre.localeCompare(b.nombre, 'es')
    })
  }, [tiendas, ahora])

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Negocios', value: tiendas.length, color: 'text-gray-900' },
          { label: 'Vencidos', value: stats.vencidos, color: 'text-red-600' },
          { label: 'Por vencer', value: stats.porVencer, color: 'text-orange-600' },
          { label: 'Trial', value: stats.trial, color: 'text-amber-600' },
          { label: 'Al día', value: stats.alDia, color: 'text-lime-700' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-100 rounded-2xl px-4 py-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{s.label}</p>
            <p className={`text-[26px] font-black mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {solicitudes.length > 0 && (
        <div>
          <h2 className="text-[14px] font-semibold text-[#0A0A0A] mb-3 flex items-center gap-2">
            Solicitudes de upgrade
            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {solicitudes.length}
            </span>
          </h2>
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <ul className="divide-y divide-gray-50">
              {solicitudes.map(s => (
                <li key={s.id} className="px-5 py-3 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900">{s.tienda_nombre}</p>
                    {s.mensaje && (
                      <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2">{s.mensaje}</p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-0.5">{fmtDate(s.created_at, { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <button
                    onClick={() =>
                      startTransition(async () => {
                        await marcarSolicitudAtendida(s.id)
                        window.location.reload()
                      })
                    }
                    disabled={isPending}
                    className="shrink-0 h-8 px-3 border border-gray-200 rounded-lg text-[11px] font-medium text-gray-600
                               hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    Atendida
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-[14px] font-semibold text-[#0A0A0A] mb-3">
          Negocios registrados ({tiendas.length})
        </h2>

        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          {tiendasOrdenadas.length === 0 ? (
            <p className="px-6 py-10 text-center text-[13px] text-gray-400">No hay negocios registrados.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {tiendasOrdenadas.map(t => {
                const abierta = expandida === t.id
                const diasAcceso = diasRestantesAcceso(t.acceso_hasta)

                return (
                  <li key={t.id}>
                    <button
                      onClick={() => setExpandida(abierta ? null : t.id)}
                      className="w-full text-left px-5 py-4 hover:bg-gray-50/60 transition-colors flex items-center gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[14px] font-semibold text-gray-900">{t.nombre}</p>
                          {t.solicitudes_pendientes > 0 && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              {t.solicitudes_pendientes} solicitud
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-gray-400 mt-0.5 capitalize">
                          {t.rubro}
                          {t.owner && ` · ${t.owner.nombre}${t.owner.apellido ? ' ' + t.owner.apellido : ''}`}
                        </p>
                      </div>

                      <AccesoBadge
                        plan={t.plan}
                        trial_hasta={t.trial_hasta}
                        acceso_hasta={t.acceso_hasta}
                      />

                      <div className="hidden sm:block text-right min-w-[110px]">
                        <p className="text-[11px] text-gray-400">Acceso</p>
                        <p className="text-[12px] font-medium text-gray-700">{fmtDate(t.acceso_hasta)}</p>
                        {diasAcceso > 0 && (
                          <p className="text-[10px] text-gray-400">{diasAcceso}d rest.</p>
                        )}
                      </div>

                      <p className="hidden md:block text-[11px] text-gray-400 min-w-[70px] text-right">
                        {fmtDate(t.created_at)}
                      </p>

                      <svg
                        viewBox="0 0 20 20" fill="currentColor"
                        className={`w-4 h-4 text-gray-300 transition-transform shrink-0 ${abierta ? 'rotate-180' : ''}`}
                      >
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {abierta && (
                      <EditarTiendaPanel
                        tienda={t}
                        onDone={() => setExpandida(null)}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
