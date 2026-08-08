'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { completarOnboarding, type DatosOnboarding } from '@/app/actions/onboarding'
import { LABEL_RUBRO, getConfigRubro } from '@/lib/rubro/config'
import { formatNumeroTicket } from '@/lib/tickets/format'
import type { Rubro } from '@/types/database'

interface Props {
  tiendaNombre: string
  rubro: Rubro
  prefijoActual: string
}

const TOTAL_PASOS = 4

export function OnboardingWizard({ tiendaNombre, rubro, prefijoActual }: Props) {
  const config = getConfigRubro(rubro)
  const [paso, setPaso] = useState(1)
  const [isPending, startTransition] = useTransition()
  const [datos, setDatos] = useState<DatosOnboarding>({
    razon_social: '',
    cuit: '',
    telefono: '',
    prefijo_ticket: prefijoActual || 'T',
    texto_pie: '¡Gracias por su compra!',
  })

  const actualizar = (campo: keyof DatosOnboarding, valor: string) =>
    setDatos((d) => ({ ...d, [campo]: valor }))

  const siguiente = () => setPaso((p) => Math.min(p + 1, TOTAL_PASOS))
  const anterior  = () => setPaso((p) => Math.max(p - 1, 1))

  const handleFinalizar = () => {
    startTransition(async () => {
      await completarOnboarding(datos)
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-soft to-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progreso */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {Array.from({ length: TOTAL_PASOS }, (_, i) => {
              const n = i + 1
              const activo = n === paso
              const completado = n < paso
              return (
                <div key={n} className="flex items-center flex-1">
                  <div className={[
                    'w-8 h-8 rounded-[var(--radius-full)] flex items-center justify-center text-sm font-semibold transition-colors',
                    activo    ? 'bg-primary text-primary-fg'              : '',
                    completado? 'bg-primary-border text-fg-brand'         : '',
                    !activo && !completado ? 'bg-surface-sunken text-fg-subtle' : '',
                  ].join(' ')}>
                    {completado ? '✓' : n}
                  </div>
                  {n < TOTAL_PASOS && (
                    <div className={`flex-1 h-0.5 mx-1 ${completado ? 'bg-primary-border' : 'bg-surface-sunken'}`} />
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-fg-subtle text-center">Paso {paso} de {TOTAL_PASOS}</p>
        </div>

        {/* Contenido del paso */}
        <div className="bg-surface rounded-[var(--radius-lg)] shadow-lg border border-border-subtle p-8">
          {/* PASO 1: Bienvenida */}
          {paso === 1 && (
            <div className="text-center space-y-4">
              <div className="text-5xl">🎉</div>
              <h1 className="text-2xl font-bold text-fg">
                ¡Bienvenido a CValleTienda!
              </h1>
              <p className="text-fg-muted">
                Tu tienda <strong>{tiendaNombre}</strong> fue creada exitosamente como{' '}
                <span className="text-fg-brand font-medium">{LABEL_RUBRO[rubro]}</span>.
              </p>
              <div className="bg-primary-soft rounded-[var(--radius-lg)] p-4 text-left space-y-2">
                <p className="text-sm font-semibold text-fg-brand">Con tu rubro tenés habilitado:</p>
                <ul className="text-sm text-fg-brand space-y-1">
                  <li>✓ Variante principal: <strong>{config.labelVar1}</strong></li>
                  {config.usarVar2 && (
                    <li>✓ Variante secundaria: <strong>{config.labelVar2}</strong></li>
                  )}
                  <li>✓ Unidades: <strong>{config.unidadesDisponibles.join(', ')}</strong></li>
                </ul>
              </div>
              <p className="text-sm text-fg-muted">
                Configuremos tu tienda en 3 pasos rápidos (podés hacerlo después desde Configuración).
              </p>
            </div>
          )}

          {/* PASO 2: Datos fiscales */}
          {paso === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-fg">Datos de la tienda</h2>
                <p className="text-sm text-fg-muted mt-1">
                  Se usan en los tickets y comprobantes. Podés editarlos después.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1">
                  Razón social
                </label>
                <input
                  type="text"
                  value={datos.razon_social}
                  onChange={(e) => actualizar('razon_social', e.target.value)}
                  placeholder={tiendaNombre}
                  className="w-full border border-border-default rounded-[var(--radius-md)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1">
                  CUIT
                </label>
                <input
                  type="text"
                  value={datos.cuit}
                  onChange={(e) => actualizar('cuit', e.target.value)}
                  placeholder="XX-XXXXXXXX-X"
                  className="w-full border border-border-default rounded-[var(--radius-md)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1">
                  Teléfono de contacto
                </label>
                <input
                  type="text"
                  value={datos.telefono}
                  onChange={(e) => actualizar('telefono', e.target.value)}
                  placeholder="+54 9 299 XXX-XXXX"
                  className="w-full border border-border-default rounded-[var(--radius-md)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <p className="text-xs text-fg-subtle">
                Todos los campos son opcionales en este momento.
              </p>
            </div>
          )}

          {/* PASO 3: Configuración de ticket */}
          {paso === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-fg">Ticket de venta</h2>
                <p className="text-sm text-fg-muted mt-1">
                  Personalizá cómo se verán los tickets impresos.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1">
                  Prefijo del número de ticket
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={datos.prefijo_ticket}
                    onChange={(e) => actualizar('prefijo_ticket', e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="T"
                    maxLength={6}
                    className="w-24 border border-border-default rounded-[var(--radius-md)] px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <span className="text-sm text-fg-muted">
                    → los tickets serán{' '}
                    <strong className="font-mono">{formatNumeroTicket(datos.prefijo_ticket, 1)}</strong>,{' '}
                    <strong className="font-mono">{formatNumeroTicket(datos.prefijo_ticket, 2)}</strong>…
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-fg mb-1">
                  Mensaje al pie del ticket
                </label>
                <input
                  type="text"
                  value={datos.texto_pie}
                  onChange={(e) => actualizar('texto_pie', e.target.value)}
                  placeholder="¡Gracias por su compra!"
                  className="w-full border border-border-default rounded-[var(--radius-md)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div className="bg-surface-sunken rounded-[var(--radius-lg)] p-4 border border-dashed border-border-default text-sm font-mono text-fg-muted space-y-0.5">
                <p className="text-center font-semibold">{datos.razon_social || tiendaNombre}</p>
                {datos.cuit && <p className="text-center text-xs">CUIT: {datos.cuit}</p>}
                <p className="text-center text-xs mt-1">──────────────</p>
                <p>Ticket {formatNumeroTicket(datos.prefijo_ticket, 1)}</p>
                <p className="text-xs text-fg-subtle">Item 1 .............. $100</p>
                <p className="text-xs text-fg-subtle">Item 2 .............. $200</p>
                <p className="text-center text-xs mt-1">──────────────</p>
                <p className="text-center text-xs">{datos.texto_pie}</p>
              </div>
            </div>
          )}

          {/* PASO 4: Listo */}
          {paso === 4 && (
            <div className="text-center space-y-5">
              <div className="text-5xl">🚀</div>
              <h2 className="text-2xl font-bold text-fg">¡Todo listo!</h2>
              <p className="text-fg-muted">
                Tu tienda <strong>{tiendaNombre}</strong> está configurada y lista para usar.
              </p>
              <div className="bg-surface-sunken rounded-[var(--radius-lg)] p-4 text-left space-y-2 text-sm text-fg-muted">
                <p className="font-semibold text-fg">Próximos pasos sugeridos:</p>
                <ul className="space-y-1.5">
                  <li>📦 <Link href="/productos/nuevo" className="text-fg-brand hover:underline">Agregar tu primer producto</Link></li>
                  <li>💰 <Link href="/caja" className="text-fg-brand hover:underline">Abrir la caja del día</Link></li>
                  <li>🛒 <Link href="/pos" className="text-fg-brand hover:underline">Registrar tu primera venta</Link></li>
                  <li>⚙️ <Link href="/configuracion" className="text-fg-brand hover:underline">Configurar métodos de pago y más</Link></li>
                </ul>
              </div>
            </div>
          )}

          {/* Navegación */}
          <div className="mt-8 flex justify-between items-center">
            {paso > 1 ? (
              <button
                type="button"
                onClick={anterior}
                disabled={isPending}
                className="text-sm text-fg-muted hover:text-fg disabled:opacity-50"
              >
                ← Atrás
              </button>
            ) : (
              <div />
            )}

            {paso < TOTAL_PASOS ? (
              <button
                type="button"
                onClick={siguiente}
                className="px-6 py-2 bg-primary text-primary-fg text-sm font-medium rounded-[var(--radius-md)] hover:bg-primary-hover transition"
              >
                Continuar →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalizar}
                disabled={isPending}
                className="px-6 py-2 bg-primary text-primary-fg text-sm font-medium rounded-[var(--radius-md)] hover:bg-primary-hover transition disabled:opacity-50"
              >
                {isPending ? 'Guardando…' : 'Ir al dashboard →'}
              </button>
            )}
          </div>

          {/* Skip */}
          {paso < TOTAL_PASOS && (
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={handleFinalizar}
                disabled={isPending}
                className="text-xs text-fg-subtle hover:text-fg-muted disabled:opacity-50"
              >
                Saltar configuración inicial
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
